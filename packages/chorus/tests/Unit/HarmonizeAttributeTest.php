<?php

declare(strict_types=1);

use Pixelsprout\LaravelChorus\Attributes\Harmonize;

it('can be instantiated with default values', function () {
    $attribute = new Harmonize();

    expect($attribute->tables)->toBe([])
        ->and($attribute->operations)->toBe(['create', 'update', 'delete'])
        ->and($attribute->supportsBatch)->toBeFalse();
});

it('can be instantiated with custom values', function () {
    $attribute = new Harmonize(
        tables: ['todos', 'posts'],
        operations: ['create', 'update'],
        supportsBatch: true
    );

    expect($attribute->tables)->toBe(['todos', 'posts'])
        ->and($attribute->operations)->toBe(['create', 'update'])
        ->and($attribute->supportsBatch)->toBeTrue();
});

it('can be applied to methods', function () {
    $testClass = new class
    {
        #[Harmonize(tables: ['todos'], operations: ['create'])]
        public function createTodo(array $operations): void
        {
            // Test method
        }
    };

    $reflection = new ReflectionClass($testClass);
    $method = $reflection->getMethod('createTodo');
    $attributes = $method->getAttributes(Harmonize::class);

    expect($attributes)->toHaveCount(1);

    $harmonizeAttribute = $attributes[0]->newInstance();

    expect($harmonizeAttribute)->toBeInstanceOf(Harmonize::class)
        ->and($harmonizeAttribute->tables)->toBe(['todos'])
        ->and($harmonizeAttribute->operations)->toBe(['create']);
});

it('can detect multiple methods with Harmonize attribute', function () {
    $testClass = new class
    {
        #[Harmonize(tables: ['todos'])]
        public function createTodo(array $operations): void {}

        #[Harmonize(tables: ['todos'])]
        public function updateTodo(array $operations): void {}

        public function regularMethod(): void {}
    };

    $reflection = new ReflectionClass($testClass);
    $harmonizeMethods = [];

    foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
        $attributes = $method->getAttributes(Harmonize::class);
        if (! empty($attributes)) {
            $harmonizeMethods[] = $method->getName();
        }
    }

    expect($harmonizeMethods)->toBe(['createTodo', 'updateTodo'])
        ->toHaveCount(2);
});
