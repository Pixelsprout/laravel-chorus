<script setup>
mount(() => ({
    todos: [],
    message: "Hello here",
    init() {
      // this.todos = this.$table('todos') || []
        console.log("Here")

    }
}))
</script>

<div {{ $attributes }}>
    <h2 class="text-2xl font-bold mb-4">My Todos</h2>

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
