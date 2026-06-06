import * as SQLite from 'expo-sqlite';
import { SEED_QUESTIONS } from './seed';

let db = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('quizstreet.db');
  }
  return db;
}

export async function initDatabase() {
  try {
    const database = await getDb();
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        type TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        prize TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        date_used TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch (error) {
    console.error('initDatabase error:', error);
    throw error;
  }
}

export async function seedDatabase() {
  try {
    const database = await getDb();
    const rows = await database.getAllAsync('SELECT COUNT(*) as count FROM questions');
    const count = rows[0].count;

    if (count > 0) {
      console.log(`Database already seeded with ${count} questions. Skipping.`);
      return;
    }

    // Insert in batches of 50 to avoid hitting SQLite limits
    const batchSize = 50;
    for (let i = 0; i < SEED_QUESTIONS.length; i += batchSize) {
      const batch = SEED_QUESTIONS.slice(i, i + batchSize);
      await database.withTransactionAsync(async () => {
        for (const q of batch) {
          await database.runAsync(
            `INSERT INTO questions (category, difficulty, type, question, answer, option_a, option_b, option_c, option_d, prize)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [q.category, q.difficulty, q.type, q.question, q.answer,
             q.option_a ?? null, q.option_b ?? null, q.option_c ?? null, q.option_d ?? null,
             q.prize]
          );
        }
      });
    }

    console.log(`Seeded ${SEED_QUESTIONS.length} questions successfully.`);
    await logCountsByCategory(database);
  } catch (error) {
    console.error('seedDatabase error:', error);
    throw error;
  }
}

async function logCountsByCategory(database) {
  const rows = await database.getAllAsync(
    'SELECT category, COUNT(*) as count FROM questions GROUP BY category ORDER BY category'
  );
  console.log('--- Questions per category ---');
  rows.forEach(r => console.log(`  ${r.category}: ${r.count}`));
  console.log(`  TOTAL: ${rows.reduce((sum, r) => sum + r.count, 0)}`);
}

export async function getQuestions(category, difficulty, type) {
  try {
    const database = await getDb();
    const conditions = ['used = 0'];
    const params = [];

    if (category && category !== 'All') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (difficulty && difficulty !== 'Mixed') {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }
    if (type && type !== 'All') {
      conditions.push('type = ?');
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return await database.getAllAsync(
      `SELECT * FROM questions ${where} ORDER BY RANDOM()`,
      params
    );
  } catch (error) {
    console.error('getQuestions error:', error);
    throw error;
  }
}

export async function getAllQuestions(category, difficulty) {
  try {
    const database = await getDb();
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (difficulty && difficulty !== 'Mixed') {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return await database.getAllAsync(
      `SELECT * FROM questions ${where} ORDER BY id DESC`,
      params
    );
  } catch (error) {
    console.error('getAllQuestions error:', error);
    throw error;
  }
}

export async function getQuestionById(id) {
  try {
    const database = await getDb();
    const rows = await database.getAllAsync('SELECT * FROM questions WHERE id = ?', [id]);
    return rows[0] ?? null;
  } catch (error) {
    console.error('getQuestionById error:', error);
    throw error;
  }
}

export async function addQuestion(q) {
  try {
    const database = await getDb();
    const result = await database.runAsync(
      `INSERT INTO questions (category, difficulty, type, question, answer, option_a, option_b, option_c, option_d, prize)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [q.category, q.difficulty, q.type, q.question, q.answer,
       q.option_a ?? null, q.option_b ?? null, q.option_c ?? null, q.option_d ?? null,
       q.prize]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('addQuestion error:', error);
    throw error;
  }
}

export async function updateQuestion(id, q) {
  try {
    const database = await getDb();
    await database.runAsync(
      `UPDATE questions SET category=?, difficulty=?, type=?, question=?, answer=?,
       option_a=?, option_b=?, option_c=?, option_d=?, prize=? WHERE id=?`,
      [q.category, q.difficulty, q.type, q.question, q.answer,
       q.option_a ?? null, q.option_b ?? null, q.option_c ?? null, q.option_d ?? null,
       q.prize, id]
    );
  } catch (error) {
    console.error('updateQuestion error:', error);
    throw error;
  }
}

export async function deleteQuestion(id) {
  try {
    const database = await getDb();
    await database.runAsync('DELETE FROM questions WHERE id = ?', [id]);
  } catch (error) {
    console.error('deleteQuestion error:', error);
    throw error;
  }
}

export async function markQuestionUsed(id) {
  try {
    const database = await getDb();
    const today = new Date().toISOString().split('T')[0];
    await database.runAsync(
      'UPDATE questions SET used = 1, date_used = ? WHERE id = ?',
      [today, id]
    );
  } catch (error) {
    console.error('markQuestionUsed error:', error);
    throw error;
  }
}

export async function resetCategoryUsed(category) {
  try {
    const database = await getDb();
    await database.runAsync(
      'UPDATE questions SET used = 0, date_used = NULL WHERE category = ?',
      [category]
    );
  } catch (error) {
    console.error('resetCategoryUsed error:', error);
    throw error;
  }
}

export async function getStatsByCategory() {
  try {
    const database = await getDb();
    return await database.getAllAsync(`
      SELECT
        category,
        COUNT(*) as total,
        SUM(used) as used_count,
        MAX(date_used) as last_used
      FROM questions
      GROUP BY category
      ORDER BY category
    `);
  } catch (error) {
    console.error('getStatsByCategory error:', error);
    throw error;
  }
}

export async function importQuestions(questionsArray) {
  try {
    const database = await getDb();
    let imported = 0;
    let skipped = 0;

    await database.withTransactionAsync(async () => {
      for (const q of questionsArray) {
        if (!q.category || !q.difficulty || !q.type || !q.question || !q.answer || !q.prize) {
          skipped++;
          continue;
        }
        await database.runAsync(
          `INSERT INTO questions (category, difficulty, type, question, answer, option_a, option_b, option_c, option_d, prize)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.category, q.difficulty, q.type, q.question, q.answer,
           q.option_a ?? null, q.option_b ?? null, q.option_c ?? null, q.option_d ?? null,
           q.prize]
        );
        imported++;
      }
    });

    return { imported, skipped };
  } catch (error) {
    console.error('importQuestions error:', error);
    throw error;
  }
}
