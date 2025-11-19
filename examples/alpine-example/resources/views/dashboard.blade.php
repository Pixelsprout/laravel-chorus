<x-layouts.app :title="__('Dashboard')">
    <div x-data="{
        message: 'Hello world!',
        todos: [],
        init() {
            this.todos = this.$table('todos'); // get todos from the table
        }
    }" class="flex h-full w-full flex-1 flex-col gap-4 rounded-xl">
        <h2>Todos: <span x-text="todos.length"></span></h2>
        <p x-text="message"></p>
        <ul>
            <template x-for="todo in todos">
                <li x-text="todo.title"></li>
            </template>
        </ul>
    </div>
</x-layouts.app>
