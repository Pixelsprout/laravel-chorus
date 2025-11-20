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

<div
    x-data="{ todos: $table('todos') }"
>
    <h2 class="text-2xl font-bold mb-4">My Todos</h2>

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
            <input
                type="text"
                name="newTitle"
                placeholder="Add a new todo..."
                class="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <button
                type="submit"
                class="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
            >
                <span wire:loading.remove>Add Todo</span>
                <span wire:loading>Adding...</span>
            </button>
        </div>
        @error('newTitle')
            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
        @enderror
    </form>

    <div class="space-y-2" x-init="init()">
        <template x-for="todo in todos" :key="todo.id">
            <div class="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-3">
                <div class="flex-1">
                    <p class="font-medium" x-text="todo.title"></p>
                </div>
                <span class="text-sm px-2 py-1 rounded"
                    :class="todo.completed_at ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'"
                    x-text="todo.completed_at ? 'Done' : 'Pending'">
                </span>
            </div>
        </template>

        <div x-show="todos.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400" x-text="message">
        </div>
    </div>
</div>
