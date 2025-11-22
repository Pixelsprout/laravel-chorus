<?php
use App\Models\Todo;
use Pixelsprout\LaravelChorus\Attributes\Harmonize;
use Pixelsprout\LaravelChorus\Traits\ProcessesHarmonizeActions;
use Livewire\Component;

new class extends Component {
    use ProcessesHarmonizeActions;

    #[Harmonize(tables: ['todos'], operations: ['create'])]
    public function createTodo(array $operations): void
    {
        // Validate operations
        $this->validateOperations($operations, ['todos'], ['create']);

        // Get todo creation data
        $todosToCreate = $this->getOperationData($operations, 'todos', 'create');

        // Create todos using the client-provided IDs
        foreach ($todosToCreate as $todoData) {
            Todo::create([
                'id' => $todoData['id'],
                'title' => $todoData['title'],
            ]);
        }
    }
};
?>

<div class="w-full max-w-4xl mx-auto"
    x-data="{
        filter: 'all',
        sortBy: 'newest',
        todos: [],
        init() {
            this.todos = $table('todos', (table) => {
                let query = table;

                // Apply sort first (before filter, for proper Dexie chaining)
                if (this.sortBy === 'newest') {
                    query = query.orderBy('created_at').reverse();
                } else if (this.sortBy === 'oldest') {
                    query = query.orderBy('created_at');
                }

                // Apply filter after sort
                if (this.filter === 'pending') {
                    query = query.filter(item => item.completed_at === null);
                } else if (this.filter === 'completed') {
                    query = query.filter(item => item.completed_at !== null);
                }

                return query;
            });
        }
    }"
>
    <h2 class="text-2xl font-bold mb-4">My Todos</h2>

    <!-- Filter and Sort buttons -->
    <div class="mb-6 flex flex-wrap gap-4">
        <!-- Filter section -->
        <div class="flex gap-2">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 self-center">Filter:</span>
            <button
                @click="filter = 'all'"
                :class="{ 'opacity-50': filter !== 'all' }"
                class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:opacity-100 transition"
            >
                All
            </button>
            <button
                @click="filter = 'pending'"
                :class="{ 'opacity-50': filter !== 'pending' }"
                class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:opacity-100 transition"
            >
                Pending
            </button>
            <button
                @click="filter = 'completed'"
                :class="{ 'opacity-50': filter !== 'completed' }"
                class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:opacity-100 transition"
            >
                Completed
            </button>
        </div>

        <!-- Sort section -->
        <div class="flex gap-2">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 self-center">Sort:</span>
            <button
                @click="sortBy = 'newest'"
                :class="{ 'opacity-50': sortBy !== 'newest' }"
                class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:opacity-100 transition"
            >
                Newest
            </button>
            <button
                @click="sortBy = 'oldest'"
                :class="{ 'opacity-50': sortBy !== 'oldest' }"
                class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:opacity-100 transition"
            >
                Oldest
            </button>
        </div>
    </div>

    <form @submit.prevent="
        (async () => {
            const form = $event.target;
            const formData = new FormData(form);
            const title = formData.get('newTitle');

            if (!title) return;

            try {
                await $harmonize('createTodo', ({ create }) => {
                    const now = new Date().toISOString();
                    create('todos', {
                        title,
                        completed_at: null,
                        created_at: now,
                        updated_at: now,
                    })
                })
            } catch (error) {
                console.error('Error creating todo:', error);
            }

            form.reset();
        })()
    " class="mb-6">
        <div class="flex gap-2">
            <flux:input
                type="text"
                name="newTitle"
                placeholder="Add a new todo..."
            />
            <flux:button
                type="submit"
            >
                <span wire:loading.remove>Add Todo</span>
                <span wire:loading>Adding...</span>
            </flux:button>
        </div>
    </form>

    <div class="space-y-2">
        <template x-for="todo in todos" :key="todo.id">
            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-3">
                <div class="flex-1">
                    <p class="font-medium" x-text="todo.title"></p>
                </div>
                <template x-if="todo.completed_at">
                    <flux:badge color="blue">
                        Done
                    </flux:badge>
                </template>
                <template x-if="!todo.completed_at">
                    <flux:badge color="gray">
                        Pending
                    </flux:badge>
                </template>
            </div>
        </template>

        <div x-show="todos.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400" x-text="message">
        </div>
    </div>
</div>
