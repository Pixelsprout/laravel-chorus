<script setup>
  mount((props: {
    message: string,
  }) => ({
    init() {
        console.log(props.message)
    }
  }))
</script>

<div>
    <span x-text="props.message"></span>
</div>
