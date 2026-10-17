CREATE TABLE "user" (
 "id" TEXT PRIMARY KEY NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL UNIQUE,
 "emailVerified" INTEGER NOT NULL DEFAULT 0,"image" TEXT,"createdAt" INTEGER NOT NULL,"updatedAt" INTEGER NOT NULL,
 "username" TEXT UNIQUE,"displayUsername" TEXT
);
CREATE TABLE "session" (
 "id" TEXT PRIMARY KEY NOT NULL,"expiresAt" INTEGER NOT NULL,"token" TEXT NOT NULL UNIQUE,
 "createdAt" INTEGER NOT NULL,"updatedAt" INTEGER NOT NULL,"ipAddress" TEXT,"userAgent" TEXT,
 "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON "session"("userId");
CREATE TABLE "account" (
 "id" TEXT PRIMARY KEY NOT NULL,"accountId" TEXT NOT NULL,"providerId" TEXT NOT NULL,
 "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
 "accessToken" TEXT,"refreshToken" TEXT,"idToken" TEXT,"accessTokenExpiresAt" INTEGER,"refreshTokenExpiresAt" INTEGER,
 "scope" TEXT,"password" TEXT,"createdAt" INTEGER NOT NULL,"updatedAt" INTEGER NOT NULL
);
CREATE INDEX account_user_idx ON "account"("userId");
CREATE TABLE "verification" (
 "id" TEXT PRIMARY KEY NOT NULL,"identifier" TEXT NOT NULL,"value" TEXT NOT NULL,"expiresAt" INTEGER NOT NULL,"createdAt" INTEGER NOT NULL,"updatedAt" INTEGER NOT NULL
);
CREATE INDEX verification_identifier_idx ON "verification"("identifier");
CREATE TABLE sponsor_request (
 id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 slot TEXT NOT NULL CHECK(slot IN ('left-wall','right-wall')),brand TEXT NOT NULL,contact_email TEXT NOT NULL,
 website TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'requested',created_at INTEGER NOT NULL
);
CREATE INDEX sponsor_user_idx ON sponsor_request(user_id);
CREATE TABLE match_result (
 id TEXT PRIMARY KEY NOT NULL,first_user TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 second_user TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,first_score INTEGER NOT NULL,second_score INTEGER NOT NULL,finished_at INTEGER NOT NULL
);
CREATE INDEX result_first_idx ON match_result(first_user);
CREATE INDEX result_second_idx ON match_result(second_user);
