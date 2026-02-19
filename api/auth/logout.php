<?php
require_once __DIR__ . '/../utils/response.php';

cors();
session_start();
session_destroy();
jsonResponse(['ok' => true]);
