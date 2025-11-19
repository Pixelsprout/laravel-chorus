/**
 * Example usage of the Chorus Alpine.js Plugin
 *
 * This example shows how to integrate Chorus with Alpine.js
 * using the plugin pattern.
 */

import Alpine from 'alpinejs'
import chorus from '@pixelsprout/chorus-alpine'

// Make Alpine available on the window (required for CDN usage)
window.Alpine = Alpine

// Register the Chorus plugin
Alpine.plugin(chorus)

// Example component: User List
Alpine.data('userList', () => ({
  // Using the $table magic to get reactive data
  users: null,
  loading: true,

  async init() {
    // Check if Chorus is already initialized (e.g., by Blade directive)
    if (!this.$chorus.isInitialized) {
      // Initialize manually if needed
      await this.$chorus.init({
        userId: 1, // Set your user ID
        debugMode: true,
        onRejectedHarmonic: (harmonic) => {
          console.error('Harmonic rejected:', harmonic)
        }
      })
    }

    // Now we can safely use $table
    this.users = this.$table('users')
    this.loading = false
  },

  // Computed property for active users
  get activeUsers() {
    return this.users?.filter(user => user.status === 'active') || []
  },

  // Computed property for user count
  get userCount() {
    return this.users?.length || 0
  }
}))

// Example component: Posts with filtering
Alpine.data('postList', () => ({
  posts: null,
  filter: 'all',

  async init() {
    // Get reactive posts data
    this.posts = this.$table('posts')
  },

  get filteredPosts() {
    if (!this.posts) return []

    if (this.filter === 'all') return this.posts
    if (this.filter === 'published') {
      return this.posts.filter(post => post.published)
    }
    if (this.filter === 'draft') {
      return this.posts.filter(post => !post.published)
    }

    return this.posts
  },

  togglePublished(postId) {
    const post = this.posts.find(p => p.id === postId)
    if (post) {
      // Update will automatically sync via Chorus
      post.published = !post.published
    }
  }
}))

// Example component: Simple initialization check
Alpine.data('chorusStatus', () => ({
  get isReady() {
    return this.$chorus.isInitialized
  },

  get chorusInstance() {
    return this.$chorus.instance
  }
}))

// Start Alpine
Alpine.start()

/**
 * HTML Usage Examples:
 *
 * 1. User List Component:
 *
 * <div x-data="userList">
 *   <div x-show="loading">Loading users...</div>
 *
 *   <div x-show="!loading">
 *     <p>Total users: <span x-text="userCount"></span></p>
 *     <p>Active users: <span x-text="activeUsers.length"></span></p>
 *
 *     <ul>
 *       <template x-for="user in users" :key="user.id">
 *         <li>
 *           <span x-text="user.name"></span>
 *           (<span x-text="user.status"></span>)
 *         </li>
 *       </template>
 *     </ul>
 *   </div>
 * </div>
 *
 *
 * 2. Posts with Filtering:
 *
 * <div x-data="postList">
 *   <div>
 *     <button @click="filter = 'all'">All</button>
 *     <button @click="filter = 'published'">Published</button>
 *     <button @click="filter = 'draft'">Drafts</button>
 *   </div>
 *
 *   <ul>
 *     <template x-for="post in filteredPosts" :key="post.id">
 *       <li>
 *         <h3 x-text="post.title"></h3>
 *         <button @click="togglePublished(post.id)">
 *           <span x-text="post.published ? 'Unpublish' : 'Publish'"></span>
 *         </button>
 *       </li>
 *     </template>
 *   </ul>
 * </div>
 *
 *
 * 3. Status Check:
 *
 * <div x-data="chorusStatus">
 *   <div x-show="isReady">
 *     ✅ Chorus is initialized and ready!
 *   </div>
 *   <div x-show="!isReady">
 *     ⏳ Initializing Chorus...
 *   </div>
 * </div>
 *
 *
 * 4. Inline usage with $table:
 *
 * <div x-data="{ tasks: $table('tasks') }">
 *   <ul>
 *     <template x-for="task in tasks" :key="task.id">
 *       <li x-text="task.title"></li>
 *     </template>
 *   </ul>
 * </div>
 */