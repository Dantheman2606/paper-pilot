export interface User {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export interface Chat {
    id: string;
    user_id: string;
    title: string;
    model: string;
    created_at: Date;
    updated_at: Date;
}

export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    token_count?: number;
    created_at: Date;
}

export interface Document {
    id: string;
    chat_id: string;
    user_id: string;
    original_name: string;
    storage_path: string;
    mime_type?: string;
    size_bytes?: number;
    embedding_status: 'pending' | 'processing' | 'ready' | 'failed';
    vector_store_id?: string;
    chunk_count?: number;
    created_at: Date;
}

export interface AuthPayload {
    userId: string;
    email: string;
}

export type AIModel =
    | 'gemini-1.5-flash'
    | 'gemini-1.5-pro'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'gpt-3.5-turbo';
