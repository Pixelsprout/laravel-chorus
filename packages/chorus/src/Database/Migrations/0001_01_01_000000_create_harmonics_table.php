<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('harmonics', function (Blueprint $table) {
      $table->uuid('id')->primary();
      $table->string('table_name')->nullable();
      $table->string('record_id')->nullable();
      $table->string('operation'); // create, update, delete
      $table->json('data')->nullable();
      $table->unsignedBigInteger('user_id')->nullable(); // For scoped sync
      $table->timestamp('processed_at')->nullable(); // For deduplication
      $table->boolean('rejected')->default(false)->after('processed_at');
      $table->string('rejected_reason')->nullable()->after('rejected');
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

