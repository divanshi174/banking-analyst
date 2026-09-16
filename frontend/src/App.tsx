import { useEffect, useRef, useState } from 'react'
import {
    ArrowUp, BarChart3, Check, ChevronDown, Database, FileText, Filter,
    Landmark, LineChart as LineChartIcon, LoaderCircle, MessageSquare, Search,
    ShieldCheck, Sparkles, Table2, X,
} from 'lucide-react'
import {
    Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from 'recharts'
import './App.css'

type VisualizationType = 'kpi' | 'bar' | 'line' | 'table'
type DataRow = Record<string, string | number | null>
type AnalystResponse = { question: string; sql: string; results: DataRow[]; visualizationType: VisualizationType }
type ChatMessage =
    | { id: number; role: 'user'; question: string }
    | { id: number; role: 'assistant'; response: AnalystResponse }
    | { id: number; role: 'error'; question: string; message: string }

const API_URL = 'http://localhost:3000/api/chat'
const suggestedPrompts = ['Total volume per branch', 'Top 5 spending customers', 'Monthly transaction trends', 'Risk rating breakdown']

const formatLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
const formatValue = (value: string | number | null) => {
    if (typeof value === 'number') return new Intl.NumberFormat('en-US', { maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value)
    return value ?? '—'
}
const isNumeric = (value: string | number | null): value is number => typeof value === 'number'

function KpiCards({ rows }: { rows: DataRow[] }) {
    const metrics = Object.entries(rows[0] ?? {}).filter(([, value]) => isNumeric(value))
    return <div className="kpi-grid">
        {metrics.map(([key, value], index) => <div className={`kpi-card kpi-card-${index % 3}`} key={key}>
            <span className="kpi-label">{formatLabel(key)}</span><strong>{formatValue(value)}</strong><span className="kpi-footnote">Live from banking database</span>
        </div>)}
    </div>
}

function ChartView({ rows, type }: { rows: DataRow[]; type: 'bar' | 'line' }) {
    const keys = Object.keys(rows[0] ?? {})
    const categoryKey = keys.find((key) => !isNumeric(rows[0]?.[key] ?? null)) ?? keys[0]
    const valueKeys = keys.filter((key) => key !== categoryKey && isNumeric(rows[0]?.[key] ?? null))
    const Chart = type === 'bar' ? BarChart : LineChart
    const heading = type === 'bar'
        ? `${formatLabel(categoryKey)} comparison`
        : `${formatLabel(categoryKey)} trend`
    return <div className="chart-wrap">
        <div className="visualizer-heading"><div><span className="eyebrow">Visual analysis</span><h3>{heading}</h3></div>{type === 'bar' ? <BarChart3 size={18} /> : <LineChartIcon size={18} />}</div>
        <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><Chart data={rows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8e2dc" /><XAxis dataKey={categoryKey} tick={{ fill: '#66756d', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#66756d', fontSize: 11 }} axisLine={false} tickLine={false} width={42} /><Tooltip cursor={{ fill: '#eff5f0' }} contentStyle={{ border: '1px solid #d8e2dc', borderRadius: 8, fontSize: 12 }} />
            {valueKeys.slice(0, 2).map((key, index) => type === 'bar' ? <Bar key={key} dataKey={key} fill={index === 0 ? '#1d7655' : '#e9a93e'} radius={[4, 4, 0, 0]} /> : <Line key={key} dataKey={key} stroke={index === 0 ? '#1d7655' : '#e9a93e'} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
        </Chart></ResponsiveContainer></div>
        <div className="chart-legend">{valueKeys.slice(0, 2).map((key, index) => <span key={key}><i className={index === 0 ? 'legend-green' : 'legend-gold'} />{formatLabel(key)}</span>)}</div>
    </div>
}

function DataTable({ rows }: { rows: DataRow[] }) {
    const [filter, setFilter] = useState('')
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [ascending, setAscending] = useState(true)
    const columns = Object.keys(rows[0] ?? {})
    const filteredRows = rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(filter.toLowerCase())))
    const visibleRows = sortKey
        ? [...filteredRows].sort((left, right) => String(left[sortKey] ?? '').localeCompare(String(right[sortKey] ?? ''), undefined, { numeric: true }) * (ascending ? 1 : -1))
        : filteredRows
    const changeSort = (key: string) => { if (sortKey === key) setAscending((current) => !current); else { setSortKey(key); setAscending(true) } }
    return <div className="table-wrap">
        <div className="table-toolbar"><div className="visualizer-heading"><div><span className="eyebrow">Query results</span><h3>Detailed records</h3></div><Table2 size={18} /></div><label className="table-search"><Search size={14} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter rows" />{filter && <button type="button" onClick={() => setFilter('')} aria-label="Clear filter"><X size={14} /></button>}</label></div>
        <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}><button type="button" onClick={() => changeSort(column)}>{formatLabel(column)} <ChevronDown size={13} /></button></th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={`${index}-${String(row[columns[0]])}`}>{columns.map((column) => <td key={column}>{formatValue(row[column])}</td>)}</tr>)}</tbody></table></div>
        <span className="row-count">Showing {visibleRows.length} of {rows.length} rows</span>
    </div>
}

function Visualizer({ response }: { response: AnalystResponse }) {
    if (!response.results.length) return <div className="empty-results">No records matched this question.</div>
    if (response.visualizationType === 'kpi') return <KpiCards rows={response.results} />
    if (response.visualizationType === 'bar' || response.visualizationType === 'line') return <ChartView rows={response.results} type={response.visualizationType} />
    return <DataTable rows={response.results} />
}

function App() {
    const [question, setQuestion] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const feedEndRef = useRef<HTMLDivElement>(null)
    useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

    const askQuestion = async (submittedQuestion: string) => {
        const trimmedQuestion = submittedQuestion.trim()
        if (!trimmedQuestion || isLoading) return
        setQuestion(''); setMessages((current) => [...current, { id: Date.now(), role: 'user', question: trimmedQuestion }]); setIsLoading(true)
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: trimmedQuestion }) })
            const payload = await response.json() as AnalystResponse & { error?: string }
            if (!response.ok) throw new Error(payload.error ?? 'The query could not be completed.')
            setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', response: payload }])
        } catch (requestError) {
            const message = requestError instanceof Error && requestError.message.includes('fetch') ? 'The analyst service is offline. Start the backend and try again.' : requestError instanceof Error ? requestError.message : 'The query could not be completed.'
            setMessages((current) => [...current, { id: Date.now() + 1, role: 'error', question: trimmedQuestion, message }])
        } finally { setIsLoading(false) }
    }

    return <main className="app-shell">
        <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><Landmark size={20} /></div><div><span className="brand-kicker">Northstar / Intelligence</span><h1>Enterprise Banking Conversational Analyst</h1></div></div><div className="connection-badge"><span className="status-dot" /><Database size={15} /> Database Connected</div></header>
        <div className="workspace">
            <aside className="side-rail"><div className="rail-intro"><span className="rail-number">01</span><span>Ask your data</span></div><p className="rail-copy">Explore transaction activity, customer risk, and branch performance with natural language.</p><div className="rail-rule" /><div className="trust-note"><ShieldCheck size={17} /><span>Read-only analysis<br /><small>Queries are security validated</small></span></div><div className="rail-bottom"><span>ANALYST CONSOLE</span><strong>v1.0.0</strong></div></aside>
            <section className="analyst-panel"><div className="panel-heading"><div><span className="eyebrow">Live workspace</span><h2>What would you like to know?</h2></div><div className="panel-meta"><span><span className="pulse-dot" /> Ready</span><span>SQLite / Read only</span></div></div>
                <div className="prompt-strip"><span className="prompt-label"><Sparkles size={14} /> Suggested prompts</span><div className="prompt-list">{suggestedPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => void askQuestion(prompt)}>{prompt}<ArrowUp size={13} /></button>)}</div></div>
                <div className="chat-feed" aria-live="polite">
                    {!messages.length && <div className="empty-chat"><div className="empty-icon"><MessageSquare size={22} /></div><h3>Your banking data, at a glance.</h3><p>Ask a question above or choose a prompt to generate a live analysis.</p></div>}
                    {messages.map((message) => <div className={`message-block message-${message.role}`} key={message.id}>
                        {message.role === 'user' && <div className="user-bubble"><span>You</span><p>{message.question}</p></div>}
                        {message.role === 'error' && <div className="error-box"><div className="error-title"><X size={16} /> Query could not run</div><p>{message.message}</p><span>Try rephrasing your question or select one of the suggested prompts.</span></div>}
                        {message.role === 'assistant' && <div className="assistant-card"><div className="assistant-heading"><div className="assistant-avatar"><Sparkles size={16} /></div><div><strong>Analyst</strong><span>Just now · Validated query</span></div><Check className="success-icon" size={17} /></div><p className="answer-lead">Here’s the analysis for <strong>“{message.response.question}”</strong></p><details className="sql-details"><summary><span><FileText size={14} /> View executed SQL</span><ChevronDown size={14} /></summary><pre>{message.response.sql}</pre></details><Visualizer response={message.response} /></div>}
                    </div>)}
                    {isLoading && <div className="loading-line"><LoaderCircle size={16} className="spin" /> Running validated analysis...</div>}<div ref={feedEndRef} />
                </div>
                <form className="composer" onSubmit={(event) => { event.preventDefault(); void askQuestion(question) }}><div className="composer-input"><Filter size={17} /><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your banking data..." aria-label="Ask about your banking data" /><span className="shortcut">↵</span></div><button className="send-button" type="submit" disabled={!question.trim() || isLoading} aria-label="Run analysis"><ArrowUp size={19} /></button></form><p className="composer-note">Answers are generated from your connected banking database. Always review results before making decisions.</p>
            </section>
        </div>
    </main>
}

export default App