CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  organization VARCHAR(160) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL DEFAULT '',
  area VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX customers_name_idx (name),
  INDEX customers_phone_idx (phone),
  INDEX customers_area_idx (area)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  object_key VARCHAR(512) NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(160) NOT NULL,
  size BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX customer_files_customer_idx (customer_id),
  CONSTRAINT customer_files_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  content_json LONGTEXT NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_images (
  image_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  content_type VARCHAR(32) NOT NULL,
  byte_length INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_image_chunks (
  image_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  chunk_index SMALLINT UNSIGNED NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  PRIMARY KEY (image_key, chunk_index),
  CONSTRAINT site_image_chunks_image_fk
    FOREIGN KEY (image_key) REFERENCES site_images(image_key) ON DELETE CASCADE
) ENGINE=InnoDB;
