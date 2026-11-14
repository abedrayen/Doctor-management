pub mod connection;
pub mod migrations;

use rusqlite::{Connection, OptionalExtension, Params, Row, params_from_iter, types::ToSql};

use crate::domain::error::{AppError, AppResult};
use crate::domain::models::{Model, Record};

pub type Cols<'a> = &'a [(&'a str, &'a dyn ToSql)];

/// Builds a column list: `&cols!["nom" => nom, "age" => age]` (values are borrowed).
macro_rules! cols {
    ($($k:literal => $v:expr),* $(,)?) => {
        [ $( ($k, &$v as &dyn rusqlite::types::ToSql) ),* ]
    };
}
pub(crate) use cols;

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// UTC timestamp (RFC 3339, seconds) used for `created_at` / `updated_at` / `archived_at`.
pub fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

/// Local calendar date (`YYYY-MM-DD`), used to compare with business dates entered by the doctor.
pub fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

/// Inserts a row, adding `id`, `created_at` (and `updated_at` when the table has it). Returns the new id.
pub fn insert_new(conn: &Connection, table: &str, cols: Cols, has_updated: bool) -> AppResult<String> {
    let id = new_id();
    let ts = now();
    let mut all: Vec<(&str, &dyn ToSql)> = cols.to_vec();
    all.push(("id", &id));
    all.push(("created_at", &ts));
    if has_updated {
        all.push(("updated_at", &ts));
    }
    let names = all.iter().map(|(k, _)| *k).collect::<Vec<_>>().join(", ");
    let marks = vec!["?"; all.len()].join(", ");
    let values: Vec<&dyn ToSql> = all.iter().map(|(_, v)| *v).collect();
    conn.execute(&format!("INSERT INTO {table} ({names}) VALUES ({marks})"), params_from_iter(values))?;
    Ok(id)
}

/// Updates the given columns of a row (never `patient_id`), refreshing `updated_at` when the table has it.
pub fn update_row(conn: &Connection, table: &str, id: &str, cols: Cols, has_updated: bool) -> AppResult<()> {
    let ts = now();
    let mut sets: Vec<(&str, &dyn ToSql)> = cols.iter().filter(|(k, _)| *k != "patient_id").copied().collect();
    if has_updated {
        sets.push(("updated_at", &ts));
    }
    let assignments = sets.iter().map(|(k, _)| format!("{k} = ?")).collect::<Vec<_>>().join(", ");
    let mut values: Vec<&dyn ToSql> = sets.iter().map(|(_, v)| *v).collect();
    values.push(&id);
    let changed = conn.execute(&format!("UPDATE {table} SET {assignments} WHERE id = ?"), params_from_iter(values))?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("Enregistrement introuvable ({table})")));
    }
    Ok(())
}

pub fn query_all<T>(
    conn: &Connection,
    sql: &str,
    params: impl Params,
    map: impl FnMut(&Row) -> rusqlite::Result<T>,
) -> AppResult<Vec<T>> {
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params, map)?;
    let items = rows.collect::<Result<Vec<T>, _>>()?;
    Ok(items)
}

pub fn query_opt<T>(
    conn: &Connection,
    sql: &str,
    params: impl Params,
    map: impl FnOnce(&Row) -> rusqlite::Result<T>,
) -> AppResult<Option<T>> {
    Ok(conn.query_row(sql, params, map).optional()?)
}

pub fn count(conn: &Connection, sql: &str, params: impl Params) -> AppResult<i64> {
    Ok(conn.query_row(sql, params, |r| r.get(0))?)
}

/// `SELECT * FROM table WHERE id = ?` as a `Record`.
pub fn get_record<T: Model>(conn: &Connection, table: &str, id: &str, label: &str) -> AppResult<Record<T>> {
    query_opt(conn, &format!("SELECT * FROM {table} WHERE id = ?1"), [id], Record::<T>::from_row)?
        .ok_or_else(|| AppError::not_found(label))
}

/// All rows of `table` where `fk_col = fk_value`, ordered by `order_by` (code-controlled SQL fragment).
pub fn list_records<T: Model>(
    conn: &Connection,
    table: &str,
    fk_col: &str,
    fk_value: &str,
    order_by: &str,
) -> AppResult<Vec<Record<T>>> {
    query_all(
        conn,
        &format!("SELECT * FROM {table} WHERE {fk_col} = ?1 ORDER BY {order_by}"),
        [fk_value],
        Record::<T>::from_row,
    )
}

/// Replaces all child rows (e.g. allergies) of a patient with `items`.
pub fn replace_children<T: Model>(conn: &Connection, table: &str, patient_id: &str, items: &[T], has_updated: bool) -> AppResult<()> {
    conn.execute(&format!("DELETE FROM {table} WHERE patient_id = ?1"), [patient_id])?;
    for item in items {
        let mut cols = item.columns();
        cols.push(("patient_id", &patient_id));
        insert_new(conn, table, &cols, has_updated)?;
    }
    Ok(())
}
