<x-layouts.app :title="__('Dashboard')">
    <div x-data="{
        message: 'Hello world!',
        todos: [],
        init() {
            this.todos = this.$table('todos'); // get todos from the table
        }
    }" class="flex h-full w-full flex-1 flex-col gap-4 rounded-xl">
        <livewire:todo-list />
    </div>
</x-layouts.app>
