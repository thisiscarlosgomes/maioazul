import Image from "next/image";

const initiatives = [
  { number: "01", category: "CONSTRUIR COM DADOS", title: "Maio Open Data API", description: "Os dados da ilha, prontos para novas ideias. Aceda à documentação e integre informação do Maio nas suas aplicações.", href: "https://api.maio.cv", action: "Explorar a API", className: "api", tags: ["Dados abertos", "Programadores"] },
  { number: "02", category: "CONHECER PARA PARTICIPAR", title: "Portal de Dados", description: "Uma janela para o Maio em números. Explore indicadores, acompanhe o território e conheça melhor a realidade da ilha.", href: "https://portal.maio.cv", action: "Consultar os dados", className: "data", tags: ["Indicadores", "Transparência"] },
  { number: "03", category: "DESCOBRIR A ILHA", title: "VisitMaio", description: "O primeiro passo para estar mais perto. Descubra praias, lugares e experiências e prepare a sua visita ao Maio.", href: "https://visitmaio.com", action: "Descobrir o Maio", className: "visit", tags: ["Turismo", "Experiências"] },
];

export default function Home() {
  return <>
    <a className="skip-link" href="#conteudo">Saltar para o conteúdo</a>
    <header className="header" id="topo">
      <a className="wordmark" href="#topo" aria-label="MaioCV — início">maio<span>cv</span><i aria-hidden="true">✳</i></a>
      <nav aria-label="Navegação principal"><a href="#iniciativas">As iniciativas <span aria-hidden="true">↗</span></a><a href="#sobre">O projeto <span aria-hidden="true">↗</span></a></nav>
      <span className="location"><span aria-hidden="true">◉</span> ILHA DO MAIO, CABO VERDE</span>
    </header>
    <main id="conteudo">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-top"><p className="eyebrow"><span className="dot" /> UM MAIO MAIS CONECTADO</p><span className="edition">LOCAL NA ORIGEM. ABERTO AO MUNDO.</span></div>
        <h1 id="hero-title">Uma ilha.<br/><span>Novas possibilidades.</span></h1>
        <div className="hero-bottom"><p>Dados que informam. Lugares que inspiram.<br/>As iniciativas digitais que aproximam o Maio do mundo.</p><a className="button" href="#iniciativas">Explore as iniciativas <span aria-hidden="true">↓</span></a></div>
      </section>
      <figure className="coast">
        <Image src="/maio-coast.jpg" alt="Vista aérea da costa do Maio, com praia de areia clara e águas turquesa" fill sizes="100vw" preload />
        <div className="image-shade" /><div className="coast-title" aria-hidden="true">Pequena ilha.<br/><em>Horizonte aberto.</em></div>
        <figcaption><span>PONTA PRETA · ILHA DO MAIO</span><span>CABO VERDE, ATLÂNTICO</span></figcaption>
      </figure>
      <section className="initiatives section" id="iniciativas" aria-labelledby="initiatives-title">
        <div className="section-heading"><div><p className="eyebrow">TRÊS PORTAS. UMA ILHA.</p><h2 id="initiatives-title">O Maio, à distância<br/>de um clique.</h2></div><p>Para quem vive, para quem visita <br/>e para quem quer construir o futuro. <br/>Escolha por onde começar.</p></div>
        <div className="cards">{initiatives.map((item) => <a className={`card ${item.className}`} href={item.href} key={item.number}>
          <div className="card-top"><span>{item.number} /</span><span className="round-arrow" aria-hidden="true">↗</span></div>
          <div className={`card-visual ${item.className}-visual`} aria-hidden="true">
            {item.className === "api" ? <><span className="bracket">&#123;</span><div className="code-lines"><span/><span/><span/><span/></div><span className="bracket">&#125;</span></> : item.className === "data" ? <div className="chart">{[35,55,43,76,62,95,82].map((height, i) => <span key={i} style={{height: `${height}%`}} />)}</div> : <Image src="/maio-vila.jpg" alt="" fill sizes="(max-width: 760px) 100vw, 33vw"/>}
          </div>
          <p className="eyebrow">{item.category}</p><h3>{item.title}</h3><p className="description">{item.description}</p><div className="tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="card-action">{item.action}<span aria-hidden="true">↗</span></div>
        </a>)}</div>
      </section>
      <section className="about section" id="sobre" aria-labelledby="about-title"><p className="eyebrow">DO MAIO. PARA TODOS.</p><div className="about-content"><h2 id="about-title">O digital aproxima.<br/>O Maio inspira<span>.</span></h2><div><p>O MaioCV reúne iniciativas digitais dedicadas à ilha do Maio. Um ponto de partida para descobrir o território, aceder a informação e encontrar novas formas de participar.</p><p>Acreditamos numa ilha mais aberta, onde o conhecimento circula e cada ligação cria possibilidades.</p><a href="#iniciativas" className="text-link">Encontre a sua próxima ligação <span aria-hidden="true">↗</span></a></div></div></section>
    </main>
    <footer className="footer"><div className="footer-top"><a className="wordmark" href="#topo" aria-label="MaioCV — voltar ao início">maio<span>cv</span><i aria-hidden="true">✳</i></a><p>Uma ilha de possibilidades.</p><a href="#topo">Voltar ao topo <span aria-hidden="true">↑</span></a></div><div className="footer-bottom"><span>MAIOCV · INICIATIVAS DIGITAIS DO MAIO</span><span>FEITO COM O MAIO NO HORIZONTE.</span></div></footer>
  </>;
}
