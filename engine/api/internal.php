<?php

class InternalPropertyResponse
{
    protected $status;
    protected $content;

    public function __construct(int $status, $content)
    {
        $this->status = $status;
        $this->content =& $content;
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    public function getContent()
    {
        return $this->content;
    }
}

class InternalEntityResponse
{
    /** @var EntityResponse */
    protected $entityResponse;

    public function __construct(EntityResponse $entityResponse)
    {
        $this->entityResponse =& $entityResponse;
    }

    public function getId()
    {
        return $this->entityResponse->getEntityId();
    }
    //TODO getClass

    public function get($propertyNameOrPath = []): InternalPropertyResponse
    {
        $propertyPath = is_string($propertyNameOrPath) ? [$propertyNameOrPath] : $propertyNameOrPath;
        $propertyResponses = $this->entityResponse->getPropertyResponses();
        $propertyPathLength = count($propertyPath);
        $content = [];
        if ($propertyPathLength === 0) {
            foreach ($propertyResponses as $propertyResponse) {
                $propertyContent = $propertyResponse->getContent();
                json_set($content, $propertyResponse->getPropertyPath(), $propertyContent);
            }
            $status = $this->entityResponse->getStatus();
        } else {
            foreach ($propertyResponses as $propertyName => $propertyResponse) {
                $head = array_slice($propertyResponse->getPropertyPath(), 0, $propertyPathLength);
                if ($propertyPath === $head) {
                    $propertyStatus = $propertyResponse->getStatus();
                    $propertyContent = $propertyResponse->getContent();
                    if (!isset($status)) {
                        $status = $propertyStatus;
                    } elseif ($status !== $propertyStatus) {
                        $status = 207;
                    }
                    $tail = array_slice($propertyResponse->getPropertyPath(), $propertyPathLength);
                    json_set($content, $tail, $propertyContent);
                }
            }
            if (!isset($status)) return new InternalPropertyResponse(400, null);
        }
        return new InternalPropertyResponse($status, $content);
    }

    public function getContent($propertyNameOrPath = [])
    {
        return $this->get($propertyNameOrPath)->getContent();
    }

    public function getStatus($propertyNameOrPath = [])
    {
        return $this->get($propertyNameOrPath)->getStatus();
    }
}

class InternalApiResponse
{
    protected $requestResponse;
    protected $content;

    public function __construct(array $requestResponses)
    {
        $this->requestResponse = array_get(array_values($requestResponses), 0);
    }

    public function getResultsById(string $entityClassNameList = '*'): array
    {
        /** @var InternalEntityResponse[] */
        $internalEntityResponses = [];
        if (is_null($this->requestResponse)) return [];
        /** @var EntityClassResponse[] */
        $entityClassResponses = $this->requestResponse->getEntityClassResponses();
        $entityClassNames = $entityClassNameList === '*'
            ? array_keys($entityClassResponses)
            : explode(',', $entityClassNameList);
        foreach ($entityClassNames as $entityClassName) {
            $entityClassResponse = array_get($entityClassResponses, $entityClassName);
            if (is_null($entityClassResponse)) {
                //TODO eerror
            } else {
                /** @var EntityResponse[] */
                $entityResponses = $entityClassResponse->getEntityResponses();
                foreach ($entityResponses as $entityId => $entityResponse) {
                    $internalEntityResponses[$entityId] = new InternalEntityResponse($entityResponse);
                }
            }
        }
        return $internalEntityResponses;
    }

    public function getStatus(): int
    {
        return is_null($this->requestResponse)
            ? 200
            : $this->requestResponse->getStatus();
    }
}

/**
 * Returns an api response for internal usage
 *
 * @param string $url The api uri and query string for example '/fruit/*?color==green'
 * @param string $method The http request method (GET|PUT|POST|DELETE|PATCH)
 * @param $content
 * @param array $headers =[]
 * @param array $accessGroups =[]
 * @return InternalApiResponse
 * @example
 * for(request('/fruit/*?color==green').getResultsById() as $id => $fruit){
 *   echo $fruit->getContent('size').PHP_EOL;
 * }
 */
function request(string $url, string $method = 'GET', $content = '', array &$headers = [], array &$accessGroups = []): InternalApiResponse

{
    //todo pass content as object, parse to string
    $splitUriOnQuestionMark = explode('?', $url);
    $uri = array_get($splitUriOnQuestionMark, 0, '');
    $queryString = array_get($splitUriOnQuestionMark, 1, '');
    $request = new ApiRequest(
        $method,
        $uri,
        $queryString,
        $headers,
        $content,
        $accessGroups
    );
    return $request->getInternalApiResponse();
}
