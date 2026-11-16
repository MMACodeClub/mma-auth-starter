<?php
declare(strict_types=1);

// Nur kanonische HTTPS-Origins: genau wie location.origin im Browser.
// Keine Zugangsdaten, Pfade (auch kein /), Query, Fragmente oder Standardports.
function mma_https_origin(string $value): bool
{
    if (!filter_var($value, FILTER_VALIDATE_URL)) return false;
    $parts = parse_url($value);
    if ($parts === false || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) return false;
    if (array_diff(array_keys($parts), ['scheme', 'host', 'port'])) return false;
    if ($parts['host'] !== strtolower($parts['host']) || str_ends_with($parts['host'], '.')) return false;
    $port = $parts['port'] ?? 443;
    if ($port < 1 || $port > 65535) return false;
    $canonical = 'https://' . $parts['host'] . ($port === 443 ? '' : ':' . $port);
    return $value === $canonical;
}
