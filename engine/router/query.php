<?php
define('DEFAULT_LIMIT', 1000);

class QueryStatement
{
    static protected function eq($lhs, $rhs): bool
    {
      if(is_string($rhs)){
        return $rhs === '*' || in_array($lhs,explode(',',$rhs));
      }else{
        return $lhs == $rhs;
      }
    }

    static protected function eqq($lhs, $rhs): bool
    {
      return $lhs == $rhs;
    }

    static protected function neq($lhs, $rhs): bool
    {
      if(is_string($rhs)){
        return $rhs !== '*' && !in_array($lhs,explode(',',$rhs));
      }else{
        return $lhs != $rhs;
      }
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
        '===' => 'eqq',
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
        $pattern = '/^([\w.]+)(' . implode('|', $operators) . '|)(.*)$/';
        preg_match($pattern, $queryStatementString, $matches);
        $this->lhs = $matches[1];
        $this->operator = $matches[2];
        $this->rhs = $matches[3];
    }

    public function getLhs()//TODO : ?string
    {
        return $this->lhs;
    }

    public function getRhs()//TODO : ?string
    {
        return $this->rhs;
    }

    public function getOperator()//TODO : ?string
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

    public function match(&$entityContent): bool
    {
        if ($this->operator === '') return true;
        if ($this->operator === '=') return true;

        //TODO use .property notation for rhs red = "red" , .red = $entityContent['red']
        $comparisonFunctionName = array_get(self::$comparisonOperators, $this->operator);
        if (is_null($comparisonFunctionName)) return false;

        $propertyPath = explode('.', $this->lhs);
        $jsonActionResponse = json_get($entityContent, $propertyPath);
        if (!$jsonActionResponse->succeeded()) return false;
        return call_user_func_array(['self', $comparisonFunctionName], [$jsonActionResponse->content, $this->rhs]);
    }

    public function checkToggle(): bool
    {
        return $this->operator === '' || ($this->operator === '=' && ($this->rhs === 'true' || $this->rhs === '1'));
    }

    public function isOption(): bool
    {
        return $this->operator === '=';
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

    public function has(string $variableName): bool
    {
        return array_key_exists($variableName, $this->queryStatements);
    }

    public function hasOption(string $variableName): bool
    {
        foreach ($this->queryStatements as $queryStatement) {
            if ($queryStatement->getLhs() === $variableName) {
                if ($queryStatement->isOption()) return true;
            }
        }
        return false;
    }

    public function getOption(string $variableName, $default = null)//TODO : ?string
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
                if ($queryStatement->checkToggle()) return true;
            }
        }
        return false;
    }

    public function getOptions(): array
    {
        $options = [];
        foreach ($this->queryStatements as $queryStatement) {
            if ($queryStatement->getOperator() === '=') {
                $options[$queryStatement->getLhs()] = $queryStatement->getRhs();
            }
        }
        return $options;
    }

    public function getAllUsedPropertyNames(): array
    {
        $propertyNames = [];
        foreach ($this->queryStatements as $queryStatement) {
            $propertyNamesUsedByStatement = $queryStatement->getAllUsedPropertyNames();
            if (count($propertyNamesUsedByStatement) > 0) {
                array_push($propertyNames, ...$propertyNamesUsedByStatement);
            }
        }
        return array_unique($propertyNames);
    }

    public function getMatchingEntityIdsAndRange(string $entityClassList, &$content, array $accessGroups): array
    {
        $entityClassNames = explode(',',$entityClassList);
        $entityIds = [];
        // filter
        //TODO handle multi class requests
        foreach ($entityClassNames as $entityClassName) {
          if(array_key_exists($entityClassName,$content)){
            $entityClassContent = $content[$entityClassName];
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
        }

        // search
        if ($this->hasOption('search')) {
            $entityClassName = $entityClassNames[0];
            $entityClassData = $content[$entityClassName]; // TODO implement or error for multi class
            $search = $this->getOption('search');
            // filter entity ids that do not contain the search string
            $entityIds = array_filter($entityIds, function ($entityId) use ($entityClassData, $search) {
                return json_search($entityClassData[$entityId], $search);;
            });
        }

        // sortBy
        if ($this->hasOption('sortBy')) {
            //TODO handle multi class requests
            $entityClassName = $entityClassNames[0];
            $entityClass = EntityClass::get($entityClassName, $accessGroups);

            $sortPath = explode('.', $this->getOption('sortBy'));

            $property = $entityClass->getProperty($sortPath);
            usort($entityIds, function ($entityIdA, $entityIdB) use ($sortPath, $entityClassName, $content, $property) {
                $entityContentA = json_get($content, array_merge([$entityClassName, $entityIdA], $sortPath));
                $entityContentB = json_get($content, array_merge([$entityClassName, $entityIdB], $sortPath));
                $entityContentA = $entityContentA->content;
                $entityContentB = $entityContentB->content;
                return $property->sort($entityContentA, $entityContentB); // Perform sorting, return -1, 0, 1
            });
        }
        // limit & offset
        $offset = $this->getOption('offset', 0);
        $range = count($entityIds);
        $limit = $this->getOption('limit', max($range, DEFAULT_LIMIT));
        $entityIds = array_slice($entityIds, $offset, $limit);
        return [
          "entityIds" => $entityIds,
          "range" => $range,
          "limit" => $limit
        ];
    }
}
