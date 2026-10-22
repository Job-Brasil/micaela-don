import { NextResponse } from 'next/server'

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function unauthorized(message = 'Não autorizado.') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Proibido.') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function badRequest(message = 'Pedido inválido.') {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Não encontrado.') {
  return NextResponse.json({ error: message }, { status: 404 })
}
