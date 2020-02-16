<?php

class QueryStatement
{
    protected $lhs;
    protected $operator;
    protected $rhs;

    public function __construct(string $queryStatementString)
    {
        //TODO parse parentheses properly  GET /cars?(color==blue|color==red)&hatchback==true
        $matches = [];
        preg_match('/^(\w+)([=!><-]*)(.*)$/', $queryStatementString, $matches, PREG_UNMATCHED_AS_NULL);
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

    public function get(string $variableName): ?string
    {
        foreach ($this->queryStatements as $queryStatement) {
            if ($queryStatement->getLhs() === $variableName) {
                $operator = $queryStatement->getOperator();
                if ($operator === '=') {
                    return  $queryStatement->getRhs();
                }
            }
        }
        return null;
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
}
