import sqlite3
import datetime

def init_db():
    conn = sqlite3.connect("sample.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] == 0:
        users = [
            ("Alice Johnson", "alice@example.com", "admin", "2026-01-15 09:30:00"),
            ("Bob Smith", "bob@example.com", "customer", "2026-02-10 14:20:00"),
            ("Charlie Brown", "charlie@example.com", "customer", "2026-03-05 11:15:00"),
            ("Diana Prince", "diana@example.com", "customer", "2026-04-12 16:45:00"),
            ("Evan Wright", "evan@example.com", "staff", "2026-05-20 08:00:00"),
        ]
        cursor.executemany("INSERT INTO users (name, email, role, created_at) VALUES (?, ?, ?, ?)", users)

        products = [
            ("Mechanical Keyboard", "Electronics", 129.99, 45),
            ("Wireless Mouse", "Electronics", 49.99, 120),
            ("Ultrawide Monitor", "Electronics", 499.99, 15),
            ("Ergonomic Chair", "Furniture", 299.00, 30),
            ("Standing Desk", "Furniture", 420.00, 20),
            ("Noise-Cancelling Headphones", "Audio", 199.50, 60),
            ("USB-C Multiport Hub", "Accessories", 39.99, 200),
            ("Leather Desk Mat", "Accessories", 29.00, 85),
        ]
        cursor.executemany("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)", products)

        orders = [
            (1, 629.98, "delivered", "2026-07-28 10:14:00"),
            (2, 49.99, "shipped", "2026-07-29 12:00:00"),
            (3, 719.00, "delivered", "2026-07-31 15:45:00"),
            (4, 199.50, "processing", "2026-08-01 09:10:00"),
            (2, 129.99, "delivered", "2026-08-02 18:30:00"),
            (1, 420.00, "delivered", "2026-08-15 14:00:00"),
            (3, 68.99, "cancelled", "2026-08-20 11:20:00"),
        ]
        cursor.executemany("INSERT INTO orders (user_id, total_amount, status, created_at) VALUES (?, ?, ?, ?)", orders)

        conn.commit()
        print("Sample database initialized successfully.")
    else:
        print("Sample database already exists with data.")

    conn.close()

if __name__ == "__main__":
    init_db()
