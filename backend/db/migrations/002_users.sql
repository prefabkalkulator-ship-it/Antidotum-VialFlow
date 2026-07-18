-- Migration: 002_users
-- Description: Tabela rodziców i dzieci

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'PARENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS children (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    group_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Przykładowe dane do testowania MVP (opcjonalnie)
INSERT INTO users (name, email, phone, role) VALUES 
('Anna Kowalska', 'anna.kowalska@example.com', '+48 123 456 789', 'PARENT'),
('Jan Nowak', 'jan.nowak@example.com', '+48 987 654 321', 'PARENT')
ON CONFLICT (email) DO NOTHING;

INSERT INTO children (parent_id, first_name, last_name, birth_date, group_id) VALUES 
((SELECT id FROM users WHERE email='anna.kowalska@example.com'), 'Zosia', 'Kowalska', '2015-05-12', 'balet-poczatkujacy'),
((SELECT id FROM users WHERE email='jan.nowak@example.com'), 'Kacper', 'Nowak', '2013-11-20', 'hiphop-srednio'),
((SELECT id FROM users WHERE email='jan.nowak@example.com'), 'Maja', 'Nowak', '2016-08-01', 'balet-poczatkujacy')
ON CONFLICT DO NOTHING;
