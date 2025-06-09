<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('harmonics', function (Blueprint $table) {
      $table->uuid('id')->primary();
      $table->string('table_name');
      $table->string('record_id');
      $table->string('operation'); // create, update, delete
      $table->json('data')->nullable();
      $table->unsignedBigInteger('user_id')->nullable(); // For scoped sync
      $table->timestamp('processed_at')->nullable(); // For deduplication
      $table->timestamps();

      // Index for faster lookups
      $table->index(['table_name', 'record_id']);
      $table->index('processed_at');
    });
  }

  public function down(): void {
    Schema::dropIfExists('harmonics');
  }
};

