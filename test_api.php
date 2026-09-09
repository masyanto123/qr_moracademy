<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::find(25);
$request = Illuminate\Http\Request::create('/api/presensi/check-today', 'GET');
$request->setUserResolver(function () use ($user) {
    return $user;
});

$controller = new App\Http\Controllers\Api\CheckTodayController();
$response = $controller->__invoke($request);
echo $response->getContent();