<?php

it('returns schema endpoint response', function () {
    $response = $this->get('/api/schema');

    $response->assertStatus(200);
});
