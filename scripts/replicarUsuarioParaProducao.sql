-- Script SQL para adicionar o usuário leandro.borges@aion.eng.br na produção
-- Execute este script no servidor de produção após fazer pull do banco

-- Verificar se o usuário já existe
SELECT COUNT(*) as existe FROM User WHERE email = 'leandro.borges@aion.eng.br';

-- Se não existir, inserir o usuário
-- NOTA: Você precisa gerar um novo hash bcrypt da senha, ou usar o hash do banco local
INSERT INTO User (id, email, name, password, role, active, canImpersonate, loginAttempts, lockedUntil, createdAt, updatedAt)
SELECT 
  'cmialo5je0000s5ofpexp2i2r',  -- ID do usuário
  'leandro.borges@aion.eng.br',  -- Email
  'Leandro Borges',              -- Nome
  '$2b$10$xwEyGdljbR6ix1k6fbtDv.j4qmYmcgMskeizLR7RmgRffr4pDOy1i',  -- Hash da senha (do banco local)
  'admin',                       -- Role
  1,                             -- Active
  1,                             -- canImpersonate
  0,                             -- loginAttempts
  NULL,                          -- lockedUntil
  datetime('now'),               -- createdAt
  datetime('now')                -- updatedAt
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE email = 'leandro.borges@aion.eng.br'
);

