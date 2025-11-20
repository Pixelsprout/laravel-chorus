<?php

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Attributes\Harmonize;
use Pixelsprout\LaravelChorus\Traits\ProcessesHarmonizeActions;

uses(DatabaseMigrations::class);

test('Livewire component can receive and process operations', function () {
    // Create a test Livewire component with Harmonize
    $component = new class {
        use ProcessesHarmonizeActions;

        public function createTodo(array $operations): void
        {
            // Validate operations
            $this->validateOperations($operations, ['todos'], ['create']);

            // Get todo creation data
            $todosToCreate = $this->getOperationData($operations, 'todos', 'create');

            // Create todos
            foreach ($todosToCreate as $todoData) {
                Todo::create([
                    'title' => $todoData['title'],
                ]);
            }
        }
    };

    // Simulate incoming operations
    $operations = [
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => [
                'title' => 'Test Todo 1',
            ],
        ],
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => [
                'title' => 'Test Todo 2',
            ],
        ],
    ];

    // Execute the action
    $component->createTodo($operations);

    // Verify todos were created
    expect(Todo::count())->toBe(2)
        ->and(Todo::where('title', 'Test Todo 1')->exists())->toBeTrue()
        ->and(Todo::where('title', 'Test Todo 2')->exists())->toBeTrue();
});

test('Livewire component rejects operations with invalid tables', function () {
    $component = new class {
        use ProcessesHarmonizeActions;

        public function createTodo(array $operations): void
        {
            $this->validateOperations($operations, ['todos'], ['create']);
        }
    };

    $operations = [
        [
            'table' => 'invalid_table',
            'operation' => 'create',
            'data' => ['title' => 'Test'],
        ],
    ];

    $component->createTodo($operations);
})->throws(ValidationException::class);

test('operations can be organized by table and operation type', function () {
    $component = new class {
        use ProcessesHarmonizeActions;

        public function handleMultipleOperations(array $operations): void
        {
            $organized = $this->organizeOperations($operations);

            // Create todos
            foreach ($organized['todos']['create'] ?? [] as $todoData) {
                Todo::create($todoData);
            }

            // Update todos
            foreach ($organized['todos']['update'] ?? [] as $updateData) {
                Todo::where('id', $updateData['id'])->update($updateData);
            }
        }
    };

    // Create initial todos
    $todo1 = Todo::create(['title' => 'Original 1']);
    $todo2 = Todo::create(['title' => 'Original 2']);

    $operations = [
        [
            'table' => 'todos',
            'operation' => 'create',
            'data' => ['title' => 'New Todo'],
        ],
        [
            'table' => 'todos',
            'operation' => 'update',
            'data' => ['id' => $todo1->id, 'title' => 'Updated 1'],
        ],
        [
            'table' => 'todos',
            'operation' => 'update',
            'data' => ['id' => $todo2->id, 'title' => 'Updated 2'],
        ],
    ];

    $component->handleMultipleOperations($operations);

    expect(Todo::count())->toBe(3)
        ->and(Todo::where('title', 'Updated 1')->exists())->toBeTrue()
        ->and(Todo::where('title', 'Updated 2')->exists())->toBeTrue()
        ->and(Todo::where('title', 'New Todo')->exists())->toBeTrue();
});

test('Harmonize attribute can be retrieved from component methods', function () {
    $component = new class {
        use ProcessesHarmonizeActions;

        #[Harmonize(tables: ['todos'], operations: ['create'])]
        public function createTodo(array $operations): void
        {
        }

        #[Harmonize(tables: ['todos'], operations: ['update', 'delete'])]
        public function modifyTodo(array $operations): void
        {
        }
    };

    $metadata = $component->getHarmonizeMetadata();

    expect($metadata)->toHaveKeys(['createTodo', 'modifyTodo'])
        ->and($metadata['createTodo']['tables'])->toBe(['todos'])
        ->and($metadata['createTodo']['operations'])->toBe(['create'])
        ->and($metadata['modifyTodo']['operations'])->toBe(['update', 'delete']);
});

test('filtering operations preserves only matching records', function () {
    $component = new class {
        use ProcessesHarmonizeActions;
    };

    $operations = [
        ['table' => 'todos', 'operation' => 'create', 'data' => ['title' => 'A']],
        ['table' => 'todos', 'operation' => 'update', 'data' => ['id' => 1, 'title' => 'B']],
        ['table' => 'posts', 'operation' => 'create', 'data' => ['title' => 'C']],
        ['table' => 'todos', 'operation' => 'create', 'data' => ['title' => 'D']],
    ];

    $filtered = $component->filterOperations($operations, 'todos', 'create');

    expect($filtered)->toHaveCount(2)
        ->and(count(array_filter($filtered, fn ($op) => $op['data']['title'] === 'A')))->toBe(1)
        ->and(count(array_filter($filtered, fn ($op) => $op['data']['title'] === 'D')))->toBe(1);
});