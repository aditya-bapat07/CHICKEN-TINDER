import { FormEvent, useEffect, useState } from "react";
import {
  ChatConversation,
  ChatPerson,
  createChatConversation,
  getChatConversations,
  getChatMessages,
  getChatPeople,
  DirectMessage,
  sendChatMessage,
} from "../api";
import { ErrorMessage, Icon, Loading } from "../components/UI";

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadConversations() {
    try {
      const result = await getChatConversations();
      setConversations(result);
      if (selected) {
        const current = result.find(
          (conversation) => conversation.id === selected.id,
        );
        if (current) setSelected(current);
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function loadPeople(value = search) {
    try {
      setPeople(await getChatPeople(value));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function openConversation(conversation: ChatConversation) {
    setSelected(conversation);
    try {
      setMessages(await getChatMessages(conversation.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function startConversation(person: ChatPerson) {
    try {
      const conversation = await createChatConversation(person.id);
      setConversations((current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ]);
      await openConversation(conversation);
      setSearch("");
      setPeople([]);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    loadConversations();
    loadPeople("");
    const timer = window.setInterval(() => {
      loadConversations();
      if (selected)
        getChatMessages(selected.id)
          .then(setMessages)
          .catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => loadPeople(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    setBusy(true);
    try {
      const message = await sendChatMessage(selected.id, body.trim());
      setMessages((current) => [...current, message]);
      setConversations((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, lastMessage: message } : item,
        ),
      );
      setBody("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your conversations.</h1>
          <p>Talk one-to-one with people who share your curiosity.</p>
        </div>
        <span className="large-emoji">
          <Icon name="smile" size={40} />
        </span>
      </div>
      <ErrorMessage error={error} />
      <section className="chat-shell panel">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-heading">
            <strong>Messages</strong>
            <span>{conversations.length}</span>
          </div>
          <label className="chat-search">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a member"
              aria-label="Find a member"
            />
          </label>
          {search && people.length > 0 && (
            <div className="people-results">
              {people.map((person) => (
                <button
                  className="person-result"
                  key={person.id}
                  onClick={() => startConversation(person)}
                >
                  <span className="avatar">
                    {person.username[0].toUpperCase()}
                  </span>
                  <span>
                    <strong>{person.username}</strong>
                    <small>{person.name}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button
                className={`conversation-row ${selected?.id === conversation.id ? "active" : ""}`}
                key={conversation.id}
                onClick={() => openConversation(conversation)}
              >
                <span className="avatar">
                  {conversation.otherUser.username[0].toUpperCase()}
                </span>
                <span>
                  <strong>@{conversation.otherUser.username}</strong>
                  <small>
                    {conversation.lastMessage?.body || "Start a conversation"}
                  </small>
                </span>
              </button>
            ))}
            {!loading && !conversations.length && (
              <p className="chat-empty">
                Search for a member to start a private conversation.
              </p>
            )}
          </div>
        </aside>
        <div className="chat-thread">
          {selected ? (
            <>
              <header className="chat-thread-header">
                <span className="avatar">
                  {selected.otherUser.username[0].toUpperCase()}
                </span>
                <div>
                  <strong>@{selected.otherUser.username}</strong>
                  <small>{selected.otherUser.name}</small>
                </div>
              </header>
              <div className="chat-thread-messages">
                {messages.map((message) => (
                  <div
                    className={`direct-message ${message.sender.id === selected.otherUser.id ? "incoming" : "outgoing"}`}
                    key={message.id}
                  >
                    <p>{message.body}</p>
                    <time>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))}
              </div>
              <form className="chat-compose" onSubmit={submit}>
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={1000}
                  placeholder="Write a message…"
                  aria-label="Message"
                />
                <button className="btn small" disabled={busy || !body.trim()}>
                  <Icon name="arrow" size={16} /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <Icon name="heart" size={34} />
              <h2>Private conversations</h2>
              <p>Choose a message or find a member to begin.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
