<?php
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user = requireAuth();
jsonResponse($user);
