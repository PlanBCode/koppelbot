<?php


class QueryStatement
{
    static protected function eq($lhs, $rhs): bool
    {
        return $lhs === $rhs;
    }

    static protected function neq($lhs, $rhs): bool
    {
        return $lhs !== $rhs;
    }

    static protected function lt($lhs, $rhs): bool
    {
        return $lhs < $rhs;
    }

    static protected function gt($lhs, $rhs): bool
    {
        return $lhs > $rhs;
    }

    static protected function leq($lhs, $rhs): bool
    {
        return $lhs <= $rhs;
    }

    static protected function geq($lhs, $rhs): bool
    {
        return $lhs >= $rhs;
    }

    static protected $comparisonOperators = [
        '==' => 'eq',
        '!=' => 'neq',
        '<' => 'lt',
        '>' => 'gt',
        '<=' => 'leq',
        '>=' => 'geq'
    ];

    protected $lhs;
    protected $operator;
    protected $rhs;

    public function __construct(string $queryStatementString)
    {
        //TODO parse parentheses/boolean expressions etc:  GET /cars?(color==blue|color==red)&hatchback==true
        $matches = [];
        $operators = array_merge(array_keys(self::$comparisonOperators), ['=']);

        preg_match('/^([\w.]+)(' . implode('|', $operators) . ')(.*)$/', $queryStatementString, $matches, PREG_UNMATCHED_AS_NULL);
        $this->lhs = $matches[1];
        $this->operator = $matches[2];
        $this->rhs = $matches[3];
    }

    public function getLhs()
    {
        return $this->lhs;
    }

    public function getRhs()
    {
        return $this->rhs;
    }

    public function getOperator()
    {
        return $this->operator;
    }

    public function getAllUsedPropertyNames(): array
    {
        //todo this only catches color==red
        // TODO color1==color2  (how to distinguish between color="red" color=red ?)  solution: use .red for rhs columns
        // TODO (color==red|color==blue)
        if (array_key_exists($this->operator, self::$comparisonOperators)) {
            return [$this->lhs];
        } else {
            return [];
        }
    }

    public function match($entityContent): bool
    {
        //TODO use .property notation for rhs red = "red" , .red = $entityContent['red']
        $comparisonFunctionName = array_get(self::$comparisonOperators, $this->operator);
        if (is_null($comparisonFunctionName)) return false;

        $propertyPath = explode('.', $this->lhs);
        $jsonActionResponse = json_get($entityContent, $propertyPath);
        if (!$jsonActionResponse->succeeded()) return false;
        return call_user_func_array(['self', $comparisonFunctionName], [$jsonActionResponse->content, $this->rhs]);
    }
}

class Query
{
    protected $queryStatements = [];

    public function __construct(string $queryString)
    {
        foreach (explode('&', $queryString) as $queryStatementString) {
            if ($queryStatementString !== '') {
                $this->queryStatements[] = new QueryStatement($queryStatementString);
            }
        }
    }

    public function add(string $queryString): Query
    {
        $query = new Query($queryString);
        foreach ($this->queryStatements as $queryStatement) {
            //TODO deduplicate
            $query->queryStatements[] = $queryStatement;
        }
        return $query;
    }

    public function get(string $variableName, $default = null): ?string
    {
        foreach ($this->queryStatements as $queryStatement) {
            if ($queryStatement->getLhs() === $variableName) {
                $operator = $queryStatement->getOperator();
                if ($operator === '=') {
                    return $queryStatement->getRhs();
                }
            }
        }
        return $default;
    }

    public function checkToggle(string $variableName): bool
    {
        foreach ($this->queryStatements as $queryStatement) {
            if ($queryStatement->getLhs() === $variableName) {
                $rhs = $queryStatement->getRhs();
                $operator = $queryStatement->getOperator();
                if ($operator === '' || ($operator === '=' && ($rhs === 'true' || $rhs === '1'))) {
                    return true;
                }
            }
        }
        return false;
    }

    public function getAllUsedPropertyNames(): array
    {
        $propertyNames = [];
        foreach ($this->queryStatements as $queryStatement) {
            $propertyNamesUsdByStatement = $queryStatement->getAllUsedPropertyNames();
            if (count($propertyNamesUsdByStatement) > 0) {
                array_push($propertyNames, ...$propertyNamesUsdByStatement);
            }
        }
        return array_unique($propertyNames);
    }


    public function getMatchingEntityIds(&$content): array
    {
        $entityIds = [];
        //TODO handle multi class requests
        foreach ($content as $entityClassName => $entityClassContent) {
            foreach ($entityClassContent as $entityId => $entityContent) {
                $flagMatch = true;
                foreach ($this->queryStatements as $queryStatement) {
                    if (!$queryStatement->match($entityContent)) {
                        $flagMatch = false;
                        break;
                    }
                }
                if ($flagMatch) array_push($entityIds, $entityId);
            }
        }
        return $entityIds;
    }
}
