<?php

declare(strict_types=1);

use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Attributes\Harmonize;
use Pixelsprout\LaravelChorus\Traits\ProcessesHarmonizeActions;

final class TestLivewireComponent
{
    use ProcessesHarmonizeActions;

    #[Harmonize(tables: ['todos'], operations: ['create'])]
    public function createTodo(array $operations): void {}

    #[Harmonize(tables: ['todos', 'posts'], operations: ['create', 'update'])]
    public function complexAction(array $operations): void {}
}

it('retrieves harmonize metadata for all methods', function () {
    $component = new TestLivewireComponent();
    $metadata = $component->getHarmonizeMetadata();

    expect($metadata)->toHaveKeys(['createTodo', 'complexAction'])
        ->and($metadata['createTodo'])->toEqual([
            'tables' => ['todos'],
            'operations' => ['create'],
            'supportsBatch' => false,
        ])
        ->and($metadata['complexAction'])->toEqual([
            'tables' => ['todos', 'posts'],
            'operations' => ['create', 'update'],
            'supportsBatch' => false,
        ]);
});

it('validates operations with valid data', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test'],
        ],
    ];

    expect(function () use ($component, $operations) {
        $component->validateOperations($operations, ['todos'], ['create']);
    })->not()->toThrow(ValidationException::class);
});

it('throws validation exception for invalid table', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'invalid_table',
            'operation' => 'create',
            'data' => ['title' => 'Test'],
        ],
    ];

    $component->validateOperations($operations, ['todos'], ['create']);
})->throws(ValidationException::class);

it('throws validation exception for invalid operation', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'todos',
            'operation' => 'delete',
            'data' => ['id' => 1],
        ],
    ];

    $component->validateOperations($operations, ['todos'], ['create', 'update']);
})->throws(ValidationException::class);

it('throws validation exception for malformed operation', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'todos',
            // Missing 'operation' and 'data'
        ],
    ];

    $component->validateOperations($operations);
})->throws(ValidationException::class);

it('filters operations by table and operation type', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test 1'],
        ],
        [
            'table' => 'todos',
            'operation' => 'update',
            'data' => ['id' => 1, 'title' => 'Updated'],
        ],
        [
            'table' => 'posts',
            'operation' => 'create',
            'data' => ['title' => 'Post 1'],
        ],
    ];

    $filtered = $component->filterOperations($operations, 'todos', 'create');

    expect($filtered)->toHaveCount(1)
        ->and($filtered[0])->toEqual([
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test 1'],
        ]);
});

it('gets operation data for specific table and operation', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test 1'],
        ],
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test 2'],
        ],
        [
            'table' => 'posts',
            'operation' => 'create',
            'data' => ['title' => 'Post 1'],
        ],
    ];

    $data = $component->getOperationData($operations, 'todos', 'create');

    expect($data)->toHaveCount(2)
        ->and($data[0])->toEqual(['title' => 'Test 1'])
        ->and($data[1])->toEqual(['title' => 'Test 2']);
});

it('organizes operations by table and operation type', function () {
    $component = new TestLivewireComponent();
    $operations = [
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test 1'],
        ],
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'Test 2'],
        ],
        [
            'table' => 'todos',
            'operation' => 'update',
            'data' => ['id' => 1, 'title' => 'Updated'],
        ],
        [
            'table' => 'posts',
            'operation' => 'create',
            'data' => ['title' => 'Post 1'],
        ],
    ];

    $organized = $component->organizeOperations($operations);

    expect($organized)->toHaveKeys(['todos', 'posts'])
        ->and($organized['todos'])->toHaveKeys(['create', 'update'])
        ->and($organized['todos']['create'])->toHaveCount(2)
        ->and($organized['todos']['update'])->toHaveCount(1)
        ->and($organized['posts']['create'])->toHaveCount(1);
});
