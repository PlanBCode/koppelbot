<?php

class QueryStatement
{
    protected $lhs;
    protected $operator;
    protected $rhs;

    public function __construct(string $queryStatementString)
    {
        //TODO parse parentheses/boolean expressions etc:  GET /cars?(color==blue|color==red)&hatchback==true
        $matches = [];
        preg_match('/^([\w.]+)([=!><-]*)(.*)$/', $queryStatementString, $matches, PREG_UNMATCHED_AS_NULL);
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
        if (in_array($this->operator, ['==', '!=', '<', '>', '<=', '>='])) {
            return [$this->lhs];
        } else {
            return [];
        }
    }

    public function match($entityContent): bool
    {
        //TODO check other operators
        //TODO refactor to ease inclusion of more operators
        //TODO use .property notation for rhs red = "red" , .red = $entityContent['red']
        if ($this->operator === '==') {
            $propertyPath = explode('.', $this->lhs);
            $jsonActionResponse = json_get($entityContent,  $propertyPath);
            if(!$jsonActionResponse->succeeded()) return false;
            return $jsonActionResponse->content === $this->rhs;
        }
        return false;
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
