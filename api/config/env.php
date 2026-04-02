<?php
function loadEnv(): void {
    static $loaded = false;
    if ($loaded) return;
    $loaded = true;

    $file = dirname(__DIR__, 2) . '/.env';
    if (!is_file($file)) return;

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;

        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);

        if (strlen($value) >= 2) {
            $q = $value[0];
            if (($q === '"' || $q === "'") && str_ends_with($value, $q)) {
                $value = substr($value, 1, -1);
            }
        }

        if (!isset($_ENV[$key]) && getenv($key) === false) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

loadEnv();
