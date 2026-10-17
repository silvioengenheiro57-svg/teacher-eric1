import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing landing-redesign">
      <header className="landing-nav">
        <Link href="/" className="landing-brand" aria-label="Teacher Eric comunidade">
          <span className="landing-brand-name">Teacher Eric<span className="brand-period">.</span></span>
          <span className="landing-brand-subtitle">comunidade</span>
        </Link>
        <nav className="landing-actions" aria-label="Navegação principal">
          <Link className="landing-login" href="/entrar">Entrar</Link>
          <Link className="landing-button landing-button-primary" href="/criar-conta">Juntar-me</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">INGLÊS COM O TEACHER ERIC</p>
          <h1>Fale inglês com <em>confiança</em>, passo a passo.</h1>
          <p className="landing-lead">Uma comunidade de alunos que aprendem juntos, com aulas estruturadas e acompanhamento direto do professor.</p>
          <div className="landing-hero-actions">
            <Link className="landing-button landing-button-primary" href="/criar-conta">Começar agora <span aria-hidden="true">→</span></Link>
            <Link className="landing-button landing-button-outline" href="/entrar">Já sou aluno</Link>
          </div>
        </div>
        <div className="landing-photo-wrap">
          <div className="landing-photo" role="img" aria-label="Alunos numa aula de inglês com o professor" />
          <div className="landing-quote"><strong>Aqui você não aprende apenas INGLÊS, você aprende a VIDA!</strong><span>— Teacher Eric</span></div>
        </div>
      </section>

      <section className="landing-benefits" aria-label="Vantagens da comunidade">
        <article className="landing-benefit">
          <span className="landing-benefit-icon" aria-hidden="true">▱</span>
          <h2>Aulas organizadas por nível</h2>
          <p>Do A1 ao C1, cada módulo tem objetivos claros, exercícios e material para descarregar.</p>
        </article>
        <article className="landing-benefit">
          <span className="landing-benefit-icon landing-chat-icon" aria-hidden="true">▢</span>
          <h2>Uma comunidade que pratica</h2>
          <p>Tire dúvidas, partilhe progressos e converse com colegas e com o professor.</p>
        </article>
        <article className="landing-benefit">
          <span className="landing-benefit-icon" aria-hidden="true">⌁</span>
          <h2>Progresso visível</h2>
          <p>Saiba sempre onde parou e o que falta para concluir o seu nível.</p>
        </article>
      </section>

      <section className="landing-cta">
        <h2>Pronto para a próxima aula?</h2>
        <Link className="landing-button landing-button-yellow" href="/criar-conta">Criar a minha conta</Link>
      </section>

      <footer className="landing-footer">© {new Date().getFullYear()} Comunidade do Teacher Eric</footer>
    </main>
  );
}
