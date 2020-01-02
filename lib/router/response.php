<?php
class Response
{
    /** @var int */
    protected $status;

    protected function addStatus(int $status): void
    {
        if (isset($this->status)) {
            if ($this->status != $status) {
                $this->status = 207; //TODO no magic number
            }
        } else {
            $this->status = $status;
        }
    }

    public function getStatus(): int
    {
        return $this->status;
    }
}

class RequestResponse extends Response
{
    protected $requestId;

    /** @var EntityClassResponse[] */
    protected $entityClassResponses = [];

    public function __construct($requestId)
    {
        $this->requestId = $requestId;
    }

    public function add(int $status, string $entityClass, string $entityId, string $propertyName, $content): void
    {
        $this->addStatus($status);
        if (!array_key_exists($entityClass, $this->entityClassResponses)) {
            $this->entityClassResponses[$entityClass] = new EntityClassResponse($entityClass);
        }
        $this->entityClassResponses[$entityClass]->add($status, $entityId, $propertyName, $content);
    }

    public function merge(RequestResponse $requestResponse): void
    {
        $this->addStatus($requestResponse->getStatus());
        foreach ($requestResponse->entityClassResponses as $entityClass => $entityClassResponse) {
            if (!array_key_exists($entityClass, $this->entityClassResponses)) {
                $this->entityClassResponses[$entityClass] = $entityClassResponse;
            } else {
                $this->entityClassResponses[$entityClass]->merge($entityClassResponse);
            }
        }
    }

    public function getContent()
    {
        $content = [];
        foreach ($this->entityClassResponses as $entityClass => $entityClassResponse) { //TODO use a map
            if ($this->status == 207) {
                $content[$entityClass] = [
                    "status" => $entityClassResponse->getStatus(),
                    "content" => $entityClassResponse->getContent(),
                ];
            } else {
                $content[$entityClass] = $entityClassResponse->getContent();
            }
        }

        return $content;
    }
}

class HttpResponse2 extends Response
{
    /** @var array <string> */
    protected $headers;

    /** @var string */
    protected $content;

    public function __construct(int $status, string $content, array $headers = [])
    {
        $this->status = $status;
        $this->content = $content;
        $this->headers = $headers;
    }

    private function echoHeaders(): void
    {
        foreach ($this->headers as $key => $value) {
            header($key . ': ' . $value);
        }
    }

    private function echoStatus(): void
    {
        http_response_code($this->status);
    }

    private function echoContent(): void
    {
        echo $this->content;
    }

    public function echo(): void
    {
        $this->echoHeaders();
        $this->echoStatus();
        $this->echoContent();
    }
}

class ApiResponse extends HttpResponse2
{
    public function __construct(string $method, $requestResponses)
    {
        $count = count($requestResponses);
        if ($count == 0) {
            parent::__construct(400, 'Request was empty');
        } elseif ($method != 'POST') {
            $requestResponse = array_values($requestResponses)[0];
            $data = $requestResponse->getContent();
            parent::__construct($requestResponse->getStatus(), json_encode($data));
        } else {
            $data = [];
            foreach ($requestResponses as $requestId => $requestResponse) {
                $this->addStatus($requestResponse->getStatus());
                $data[$requestId] = [
                    'status' => $requestResponse->getStatus(),
                    'result' => $requestResponse->getContent(),
                ];
            }
            parent::__construct($this->status, json_encode($data));
        }
    }
}

class ContentResponse extends HttpResponse2
{
    public function __construct($uri)
    {
        if ($uri == '/') {
            if (file_exists('custom/content/index.html')) {
                $fileContent = file_get_contents('custom/content/index.html');
                parent::__construct(200, $fileContent);
            } else {
                parent::__construct(200, 'Hello World');
            }
        } elseif ($uri == '/script.js') {
            $fileContent = file_get_contents('lib/front-end/script.js');
            parent::__construct(200, $fileContent);
        } elseif (file_exists('custom/content' . $uri)) {
            $fileContent = file_get_contents('custom/content' . $uri);//TODO make safe!
            parent::__construct(200, $fileContent);
        } elseif (file_exists('custom/errors/404.html')) {
            $fileContent = file_get_contents('custom/errors/404.html');
            parent::__construct(404, $fileContent);
        } else {
            parent::__construct(404, 'Page Not Found');//TODO use (default) error page
        }
    }
}
