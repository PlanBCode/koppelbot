<?php

class CliOption
{
    /** @var string */
    public $short;
    /** @var string */
    public $long;
    /** @var int */
    public $nrOfArguments;
    /** @var string */
    public $help;
    public $default;

    public function __construct(string $short, string $long, int $nrOfArguments, string $help, $default)
    {
        $this->short = $short;
        $this->long = $long;
        $this->nrOfArguments = $nrOfArguments;
        $this->help = $help;
        $this->default = $default;
    }

    public function showHelp(): string
    {
        return str_pad('  -' . $this->short . '  --' . $this->long . ' '
                . str_repeat('<arg>', $this->nrOfArguments), 25)
            . ' ' . $this->help
            . (is_null($this->default) ? '' : '(Default = ' . ($this->default === false ? 'false' : $this->default) . ')');
    }
}

function showHelp(array &$cliOptions)
{
    echo 'Usage: xyz [options] uri [content]' . PHP_EOL;
    echo '   xyz "/car?color==red"' . PHP_EOL;
    echo '   xyz "/fruit/*/size"' . PHP_EOL;
    echo PHP_EOL;
    foreach ($cliOptions as $cliOption) {
        echo $cliOption->showHelp() . PHP_EOL;
    }
}

function getCliOption(array &$cliOptions, array &$options, int $argc, array &$argv, int &$i)
{
    $arg = $argv[$i];
    if (substr($arg, 0, 1) === '-') {
        $flag_found = false;
        foreach ($cliOptions as $cliOption) {
            if ($cliOption->nrOfArguments === 0 && !is_null($cliOption->default)) {
                $options[$cliOption->long] = $cliOption->default;
            }
            if ($arg === '-h' || $arg === '--help') {
                showHelp($cliOptions);
                $i = $argc;
                $options['help'] = true;
                return;
            } elseif ($arg === '-' . $cliOption->short || $arg === '--' . $cliOption->long) {
                if ($cliOption->nrOfArguments === 0) {
                    $options[$cliOption->long] = true;
                    ++$i;
                    $flag_found = true;
                } else {
                    $options[$cliOption->long] = [];
                    for ($j = $i + 1; $j < $argc && $j < $i + $cliOption->nrOfArguments + 1; ++$j) {
                        $flag_found = true;
                        if ($cliOption->nrOfArguments === 1) {
                            $options[$cliOption->long] = $argv[$j];
                        } else {
                            $options[$cliOption->long][] = $argv[$j];
                        }
                    }
                    $i = $j;
                }
            }
        }
        if(!$flag_found){
            echo 'ERROR Unknown option: '.$arg.PHP_EOL;
            showHelp($cliOptions);
            $i = $argc;
            $options['help'] = true;
            return;
        }
    } else {
        $options['args'][] = $arg;
        ++$i;
    }
}

function getCliOptions(array &$cliOptions, int $argc, array $argv): array
{
    $options = [
        'args' => [$argv[0]]
    ];

    if (isset($argc)) {
        for ($i = 1; $i < $argc;) {
            getCliOption($cliOptions, $options, $argc, $argv, $i);
        }
    }
    return $options;
}
