-- حارتنا: جدول البيوت
CREATE TABLE IF NOT EXISTS houses (
  uid   TEXT PRIMARY KEY,
  key   TEXT NOT NULL,
  name  TEXT NOT NULL,
  lvl   INTEGER NOT NULL DEFAULT 1,
  plot  TEXT NOT NULL UNIQUE,
  roof  TEXT NOT NULL DEFAULT 'red',
  wall  INTEGER NOT NULL DEFAULT 0,
  motto TEXT NOT NULL DEFAULT '',
  look  TEXT NOT NULL DEFAULT '{}',
  t     INTEGER NOT NULL,
  u     INTEGER NOT NULL,
  dlv   INTEGER NOT NULL DEFAULT 0,
  veh   TEXT NOT NULL DEFAULT '',
  cname TEXT NOT NULL DEFAULT '',
  flag  TEXT NOT NULL DEFAULT '',
  deco  TEXT NOT NULL DEFAULT '[]',
  d     INTEGER NOT NULL DEFAULT 0
);

-- مين أخد كل دولة أول (الرئيس) — صف واحد لكل دولة
CREATE TABLE IF NOT EXISTS countries (
  d   INTEGER PRIMARY KEY,
  uid TEXT NOT NULL,
  t   INTEGER NOT NULL
);

-- عدّادات صغيرة (كم دولة انسكنت) حتى ما نعدّ كل مرة
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v INTEGER NOT NULL
);

-- نسخة جاهزة من كل البيوت (صف واحد) حتى الزيارات ما تقرا كل الجدول
CREATE TABLE IF NOT EXISTS snap (
  k    TEXT PRIMARY KEY,
  v    INTEGER NOT NULL,
  at   INTEGER NOT NULL,
  body TEXT NOT NULL
);
-- منع تكرار الاسم (بدون فرق بين كبير وصغير)
CREATE UNIQUE INDEX IF NOT EXISTS houses_name ON houses(name COLLATE NOCASE);

-- علم الدولة فوق البيت
ALTER TABLE houses ADD COLUMN cf TEXT NOT NULL DEFAULT '';
