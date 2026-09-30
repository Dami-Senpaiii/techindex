CREATE TABLE shop_request_limit (user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, resource TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(user_id, resource));
