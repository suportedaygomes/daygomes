export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const TERMS_OF_USE: LegalSection[] = [
  {
    id: "1",
    title: "1. Quem somos e o que estes termos regulam",
    paragraphs: [
      "Estes Termos de Uso disciplinam o acesso e a utilização da plataforma digital Day Gomes, disponível em daygomes.com.br e em seus subdomínios ou aplicativo progressivo (PWA), destinada ao acompanhamento de editais, envio de atividades, correções, comunicação com a equipe e demais funcionalidades educacionais oferecidas pela Day Gomes.",
      "Ao criar conta, entrar na plataforma ou utilizar qualquer serviço disponibilizado, você declara que leu, compreendeu e concorda com estes Termos e com a Política de Privacidade. Se não concordar, não utilize a plataforma.",
    ],
  },
  {
    id: "2",
    title: "2. Elegibilidade e cadastro",
    paragraphs: [
      "O uso da plataforma exige capacidade civil para contratar ou autorização de representante legal, quando aplicável. As informações fornecidas no cadastro (nome, e-mail, CPF quando solicitado, WhatsApp, data de nascimento e demais campos) devem ser verdadeiras, completas e atualizadas.",
      "Você é responsável por manter a confidencialidade da senha e por todas as ações realizadas na conta. Notifique imediatamente a equipe Day Gomes em caso de uso não autorizado ou suspeita de violação de segurança, pelo e-mail acesso@daygomes.com.br.",
      "A Day Gomes pode recusar, suspender ou encerrar cadastros que violem estes Termos, a legislação aplicável ou que apresentem indícios de fraude, compartilhamento indevido de credenciais ou conduta abusiva.",
    ],
  },
  {
    id: "3",
    title: "3. Serviços oferecidos",
    paragraphs: [
      "A plataforma permite, conforme o perfil de acesso (membro, corretor ou administrador), participar de editais e cargos vinculados, enviar arquivos de atividades por fase, acompanhar prazos, receber correções e notas, visualizar feedback dos corretores, interagir com suporte e, quando aplicável, gerenciar usuários e conteúdos.",
      "Parte do acesso pode ser liberada mediante compra em parceiros (por exemplo, integração com a Kiwify) ou por cadastro realizado pela administração. Os direitos de uso são pessoais e intransferíveis, salvo disposição expressa em contrato ou comunicado oficial.",
      "A Day Gomes trabalha para manter a plataforma disponível e segura, mas não garante funcionamento ininterrupto. Manutenções, atualizações ou falhas de terceiros (hospedagem, internet, provedores de e-mail ou armazenamento) podem causar indisponibilidade temporária.",
    ],
  },
  {
    id: "4",
    title: "4. Envio de atividades e regras dos editais",
    paragraphs: [
      "Cada edital, cargo e fase possui regras próprias de prazo, formato de arquivo e critérios de correção, informados na interface da plataforma. O envio fora do prazo, em formato não aceito ou em desacordo com as instruções pode impedir a correção ou a contagem de nota, conforme as regras do edital.",
      "Ao enviar arquivos, você declara ser titular dos direitos necessários ou possuir autorização para o conteúdo enviado, e concede à Day Gomes licença não exclusiva para armazenar, processar, exibir ao corretor designado e utilizar o material exclusivamente para fins de correção, registro acadêmico e melhoria do serviço, nos limites da lei.",
      "É proibido enviar conteúdo ilegal, difamatório, que viole direitos de terceiros, que contenha malware ou que tenha sido plagiado de forma a configurar violação de direitos autorais ou de concurso.",
    ],
  },
  {
    id: "5",
    title: "5. Correções, notas e comunicações",
    paragraphs: [
      "As correções são realizadas por corretores habilitados ou pela equipe administrativa. As notas, comentários e orientações (incluindo liberação de reenvio ou de fase seguinte) têm caráter educacional e vinculam-se às regras de cada edital. A Day Gomes não assegura resultado em concursos públicos ou seleções externas.",
      "Comunicações operacionais (correção disponível, prazos, acesso liberado, respostas de suporte) podem ser enviadas por e-mail e exibidas no painel. É sua responsabilidade manter um e-mail válido e acompanhar as mensagens.",
    ],
  },
  {
    id: "6",
    title: "6. Suporte",
    paragraphs: [
      "Dúvidas e solicitações podem ser encaminhadas pela área de suporte da plataforma ou pelo formulário público em daygomes.com.br/suporte. O atendimento ocorre em horário comercial compatível com a operação da equipe, salvo comunicação diversa.",
      "Chamados abertos sem login na plataforma são atendidos preferencialmente por e-mail ou WhatsApp informados no pedido, nos termos da Política de Privacidade.",
    ],
  },
  {
    id: "7",
    title: "7. Propriedade intelectual",
    paragraphs: [
      "Marcas, logotipos, layout, textos institucionais, vídeos, materiais didáticos e software da plataforma são de titularidade da Day Gomes ou de licenciantes, protegidos pela legislação de propriedade intelectual. Não é permitida cópia, engenharia reversa, revenda ou exploração comercial não autorizada.",
      "O conteúdo que você envia permanece de sua responsabilidade; a licença concedida à Day Gomes limita-se ao necessário para prestação do serviço.",
    ],
  },
  {
    id: "8",
    title: "8. Condutas proibidas",
    paragraphs: [
      "É vedado tentar acessar áreas ou dados de outros usuários sem autorização, interferir no funcionamento da plataforma, automatizar acessos de forma abusiva, disseminar spam, praticar assédio contra corretores ou equipe, ou utilizar a plataforma para finalidade ilícita.",
      "O descumprimento pode resultar em bloqueio imediato, exclusão de conteúdo e medidas legais cabíveis.",
    ],
  },
  {
    id: "9",
    title: "9. Pagamentos, reembolsos e encerramento de acesso",
    paragraphs: [
      "Quando o acesso for adquirido por meio de parceiros de pagamento, aplicam-se também os termos do parceiro e a política de reembolso da compra. Reembolsos reconhecidos pelo parceiro podem implicar revogação do acesso aos conteúdos vinculados na plataforma.",
      "A Day Gomes pode alterar planos, editais disponíveis e funcionalidades, comunicando usuários quando a mudança for relevante para o uso contratado.",
    ],
  },
  {
    id: "10",
    title: "10. Limitação de responsabilidade",
    paragraphs: [
      "Na extensão permitida pela lei, a Day Gomes não responde por lucros cessantes, danos indiretos ou decisões tomadas pelo usuário com base em simulados ou correções. A responsabilidade total por falha comprovada do serviço limita-se, quando cabível, ao valor pago pelo usuário pelo acesso ao produto diretamente relacionado ao evento, nos últimos doze meses.",
      "Nada nestes Termos exclui direitos irrenunciáveis do consumidor previstos no Código de Defesa do Consumidor, quando aplicável.",
    ],
  },
  {
    id: "11",
    title: "11. Alterações destes Termos",
    paragraphs: [
      "Podemos atualizar estes Termos para refletir mudanças legais ou de serviço. A data da versão vigente consta no topo da página. O uso continuado após a publicação de alterações relevantes constitui aceitação, ressalvado o direito de encerrar a conta se discordar.",
    ],
  },
  {
    id: "12",
    title: "12. Lei aplicável e foro",
    paragraphs: [
      "Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio do consumidor para dirimir controvérsias, quando aplicável o Código de Defesa do Consumidor; nos demais casos, prevalece o foro da comarca de São Paulo, SP, com renúncia a qualquer outro, por mais privilegiado que seja.",
    ],
  },
  {
    id: "13",
    title: "13. Contato",
    paragraphs: [
      "Para assuntos relacionados a estes Termos: acesso@daygomes.com.br.",
    ],
  },
];

export const PRIVACY_POLICY: LegalSection[] = [
  {
    id: "1",
    title: "1. Introdução",
    paragraphs: [
      "Esta Política de Privacidade descreve como a Day Gomes trata dados pessoais de usuários da plataforma, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais, LGPD) e normas complementares.",
      "Ao utilizar a plataforma, você confia determinados dados à Day Gomes. Levamos a sério essa confiança e adotamos medidas técnicas e organizacionais proporcionais aos riscos.",
    ],
  },
  {
    id: "2",
    title: "2. Controlador e canal de comunicação",
    paragraphs: [
      "O controlador dos dados pessoais tratados nesta plataforma é a Day Gomes, responsável pela operação do site daygomes.com.br.",
      "Pedidos relacionados à privacidade e aos direitos do titular devem ser enviados para acesso@daygomes.com.br, com assunto \"Privacidade / LGPD\". Responderemos nos prazos legais.",
    ],
  },
  {
    id: "3",
    title: "3. Dados que coletamos",
    paragraphs: [
      "Dados de cadastro e perfil: nome, e-mail, CPF (quando informado), data de nascimento, telefone/WhatsApp, foto de perfil (avatar), biografia opcional e papel na plataforma (membro, corretor ou administrador).",
      "Dados de autenticação: credenciais gerenciadas pelo provedor de autenticação (Supabase Auth), incluindo registros de sessão e tokens em cookies estritamente necessários ao login.",
      "Dados de uso educacional: vínculos a editais e cargos, fases liberadas, arquivos enviados (redações e anexos), metadados de envio (data, tipo de arquivo, tamanho), correções, notas, comentários de corretores, marcações em documentos e histórico de status.",
      "Dados de suporte: conteúdo de chamados, e-mail e WhatsApp informados, imagens anexadas e respostas da equipe.",
      "Dados de comunicação: envio de e-mails transacionais (correção, prazos, acesso, suporte) por meio do provedor Resend, com endereço de destino e conteúdo da mensagem.",
      "Dados de pagamento e integração: quando a compra ocorre via Kiwify ou integração similar, recebemos identificadores e status da transação necessários para liberar ou revogar acesso; dados completos de cartão não são armazenados pela Day Gomes no ambiente da plataforma.",
      "Dados técnicos: endereço IP, tipo de navegador, registros de erro e informações de dispositivo, coletados de forma automática na hospedagem e nos serviços de infraestrutura, para segurança e diagnóstico.",
    ],
  },
  {
    id: "4",
    title: "4. Finalidades e bases legais",
    paragraphs: [
      "Executar o contrato e prestar o serviço educacional: cadastro, autenticação, envio e correção de atividades, exibição de notas e comunicação sobre prazos.",
      "Cumrir obrigação legal ou regulatória, quando aplicável.",
      "Legítimo interesse: melhorar a segurança da plataforma, prevenir fraudes, produzir estatísticas internas agregadas e manter registros de auditoria, sempre com balanceamento em relação aos direitos dos titulares.",
      "Consentimento: quando exigido para cookies não essenciais ou comunicações opcionais, coletado de forma destacada na interface.",
      "Exercício regular de direitos em processo judicial, administrativo ou arbitral.",
    ],
  },
  {
    id: "5",
    title: "5. Compartilhamento com operadores e parceiros",
    paragraphs: [
      "Utilizamos fornecedores que tratam dados em nosso nome, sob contratos ou termos que exigem proteção adequada, entre eles: Supabase (banco de dados e autenticação), hospedagem (Vercel ou equivalente), Cloudflare R2 ou serviço similar (armazenamento de arquivos), Resend (e-mail transacional) e Kiwify (quando a compra é realizada por esse canal).",
      "Corretores e administradores autorizados acessam apenas os dados necessários à correção, ao suporte ou à gestão de editais, conforme permissões do perfil.",
      "Não vendemos dados pessoais. Podemos divulgar informações se exigido por lei, ordem judicial ou autoridade competente, ou para proteger direitos da Day Gomes e de usuários em situação de emergência de segurança.",
    ],
  },
  {
    id: "6",
    title: "6. Transferência internacional",
    paragraphs: [
      "Alguns fornecedores podem processar dados em servidores fora do Brasil. Nesses casos, adotamos cláusulas contratuais, certificações ou mecanismos previstos na LGPD para assegurar nível de proteção compatível com a legislação brasileira.",
    ],
  },
  {
    id: "7",
    title: "7. Retenção e eliminação",
    paragraphs: [
      "Mantemos os dados pelo tempo necessário às finalidades descritas, inclusive para cumprimento de obrigações legais, resolução de disputas e execução de contratos. Arquivos de atividades e correções podem ser mantidos pelo período do vínculo com o edital e por prazo adicional razoável para histórico acadêmico e defesa em eventuais reclamações.",
      "Após o encerramento da conta ou revogação de acesso, dados podem ser anonimizados ou eliminados, salvo guarda mínima exigida por lei. Você pode solicitar informações sobre prazos específicos pelo e-mail de privacidade.",
    ],
  },
  {
    id: "8",
    title: "8. Segurança",
    paragraphs: [
      "Empregamos controle de acesso por perfil, criptografia em trânsito (HTTPS), segregação de ambientes, chaves de API restritas a servidores e boas práticas de desenvolvimento. Nenhum sistema é totalmente imune a incidentes; em caso de violação relevante de dados, adotaremos medidas de mitigação e comunicação nos termos da LGPD.",
    ],
  },
  {
    id: "9",
    title: "9. Direitos do titular",
    paragraphs: [
      "Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção de dados incompletos ou desatualizados, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade, portabilidade (quando aplicável), informação sobre compartilhamentos, revogação de consentimento e revisão de decisões automatizadas, quando couber.",
      "Algumas solicitações podem ser atendidas diretamente em Meu perfil na plataforma. Demais pedidos: acesso@daygomes.com.br. Podemos solicitar confirmação de identidade para evitar fraudes.",
    ],
  },
  {
    id: "10",
    title: "10. Crianças e adolescentes",
    paragraphs: [
      "A plataforma não se destina a menores de 13 anos de forma autônoma. Usuários entre 13 e 18 anos devem utilizar o serviço com conhecimento e autorização de responsável legal, quando exigido pela legislação aplicável ao produto contratado.",
    ],
  },
  {
    id: "11",
    title: "11. Alterações desta Política",
    paragraphs: [
      "Esta Política pode ser atualizada. A data da versão vigente aparece no início do documento. Alterações relevantes serão comunicadas por meio razoável (aviso na plataforma ou e-mail).",
    ],
  },
];

export const COOKIE_POLICY: LegalSection[] = [
  {
    id: "1",
    title: "1. O que são cookies e tecnologias similares",
    paragraphs: [
      "Cookies são pequenos arquivos armazenados no seu navegador. Também usamos armazenamento local (localStorage) para preferências que não identificam você sozinhos, mas que fazem parte da experiência no site.",
    ],
  },
  {
    id: "2",
    title: "2. Cookies estritamente necessários",
    paragraphs: [
      "São indispensáveis para login, manutenção de sessão autenticada e segurança. Incluem cookies definidos pelo Supabase Auth e pelo fluxo de autenticação da plataforma. Sem eles, não é possível acessar o painel com segurança.",
      "A base legal é a execução do contrato e o legítimo interesse em proteger contas. Estes cookies não exigem consentimento prévio nos termos da orientação da ANPD para cookies essenciais.",
    ],
  },
  {
    id: "3",
    title: "3. Preferências armazenadas localmente",
    paragraphs: [
      "Podemos gravar no seu dispositivo a escolha de tema claro ou escuro e o registro de que você aceitou este aviso de cookies (chave daygomes-cookie-consent-v1). Essas informações não são enviadas a terceiros para publicidade.",
    ],
  },
  {
    id: "4",
    title: "4. Cookies de terceiros",
    paragraphs: [
      "Provedores de infraestrutura (hospedagem, CDN, armazenamento) podem definir cookies técnicos limitados ao funcionamento do serviço. Não utilizamos, na versão atual da plataforma, cookies de publicidade comportamental ou redes sociais de rastreamento no painel de login.",
      "Se no futuro incluirmos ferramentas de análise de audiência ou marketing, atualizaremos esta política e o banner de consentimento antes da ativação.",
    ],
  },
  {
    id: "5",
    title: "5. Como gerenciar",
    paragraphs: [
      "Você pode apagar cookies e dados de sites nas configurações do navegador. Isso pode encerrar sua sessão e exigir novo login. Para revogar o consentimento ao aviso exibido no login, limpe os dados do site daygomes.com.br ou use o modo anônimo e recuse na próxima visita.",
    ],
  },
  {
    id: "6",
    title: "6. Mais informações",
    paragraphs: [
      "O tratamento de dados pessoais associado ao uso da plataforma está descrito na Política de Privacidade. Dúvidas: acesso@daygomes.com.br.",
    ],
  },
];
