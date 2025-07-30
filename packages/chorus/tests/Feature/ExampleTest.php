<?php

declare(strict_types=1);

it('returns schema endpoint response', function () {
    $response = $this->get('/api/schema');

    $response->assertStatus(200);
});
