

// content collection rendering

import { elem, join } from 'nuemark/src/tags.js'
import { renderInline } from 'nuemark'

function isNew(date, offset=4) {
  const diff = new Date() - date
  return diff < offset * 24 * 3600 * 1000
}

function prettyDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function renderPrettyDate(date) {
  if (!date) date = new Date()
  else if (!date.getDate) date = new Date(date)
  return elem('time', { datetime: date.toISOString() }, prettyDate(date))
}


export function renderPage(page) {
  const { title, desc, url } = page

  // date
  const date = page.date || page.pubDate || new Date()

  const is_new = isNew(date)
  const time = renderPrettyDate(date)


  const body = elem('a', { href: url }, join([
    elem('h2', title ? renderInline(title) : ''),
    elem('p', desc ? renderInline(desc) : ''),
  ]))

  return elem('li', { class: is_new && 'is-new' }, time + body)
}


export function renderPageList(data) {
  const key = data.collection_name || data.content_collection

  if (!key) {
    console.error('content collection not defined for page-list tag')
    return ''
  }

  const items = data[key]
  const pages = items.filter(el => !el.draft && (el.date || el.pubDate)).map(renderPage)
  return elem('ul', join(pages))
}
