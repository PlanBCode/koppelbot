<?php

require('./engine/router/query.php');

class HttpRequest2
{

    /** @var string */
    protected $method;
    /** @var string */
    protected $uri;
    /** @var string */
    protected $queryString;
    /** @var array */
    protected $headers;
    /** @var string */
    protected $content;
    /** @var Query */
    protected $query;

    public function __construct(string $method, string $uri, string $queryString, array &$headers, string &$content)
    {

        $this->method = $method;
        $uri = rtrim($uri, '/'); // remove trailing slashes
        $uri = preg_replace('/\/+/', '/', $uri); // remove multiple slashes
        $this->uri = $uri;
        $this->queryString = $queryString;
        $this->headers =& $headers;
        $this->content =& $content;
        $this->query = new Query($queryString);
    }

    public function getQuery(): Query
    {
        return $this->query;
    }

}
