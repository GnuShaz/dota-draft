import { useI18n } from "./i18n";
import type { Lang } from "./i18n";
import { SITE } from "./site";

export type DocId = "privacy" | "terms";
interface Section { h: string; p: string[] }
interface LegalDoc { title: string; sections: Section[] }

const DOCS: Record<DocId, Record<Lang, LegalDoc>> = {
  privacy: {
    ru: {
      title: "Политика конфиденциальности",
      sections: [
        {
          h: "1. Общие положения",
          p: [
            "Настоящая Политика конфиденциальности (далее — Политика) описывает, какие данные обрабатываются при использовании сайта {site} (далее — Сайт), и составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».",
            "Владелец Сайта и оператор данных: {owner} (далее — Оператор). Контакт для обращений: {email}.",
            "Сайт не требует регистрации и не содержит форм для ввода персональных данных. Политика размещена в открытом доступе в нижней части каждой страницы Сайта.",
          ],
        },
        {
          h: "2. Какие данные мы получаем",
          p: [
            "Оператор не собирает и не хранит персональные данные посетителей: ФИО, телефоны, адреса электронной почты, платёжные данные, учётные записи. На Сайте нет регистрации, форм обратной связи, комментариев, платежей, рекламы и сервисов веб-аналитики.",
            "Выбранные вами ранг, позиция и герои обрабатываются только в вашем браузере и не передаются Оператору.",
          ],
        },
        {
          h: "3. Данные в вашем браузере",
          p: [
            "Сайт сохраняет в localStorage вашего браузера один параметр: выбранный язык интерфейса. Он нужен для работы интерфейса, не содержит сведений о вас и не передаётся на сервер. Cookie-файлы Сайт не устанавливает. Сохранённые данные можно удалить в настройках браузера.",
          ],
        },
        {
          h: "4. Технические данные и третьи лица",
          p: [
            "Как при открытии любого сайта, сервер, на котором размещён Сайт, получает технические данные запроса: IP-адрес, дату и время, адрес запрошенной страницы, сведения о браузере. Хостинг-провайдер может хранить их в журналах для обеспечения работы и безопасности. Оператор не использует эти сведения для идентификации посетителей, составления профилей или рекламы.",
            "Портреты героев загружаются с серверов Valve Corporation (Steam CDN). Эти серверы получают технические данные запроса так же, как при любой загрузке изображения, и Оператор не управляет такой обработкой. Значки рангов, шрифты и скрипты размещены на самом Сайте.",
          ],
        },
        {
          h: "5. Обращения по электронной почте",
          p: [
            "Если вы напишете на адрес {email}, Оператор получит ваш адрес электронной почты и содержание письма. Эти данные используются только для ответа на обращение, не передаются третьим лицам и удаляются по вашему запросу или после завершения переписки, если иное не требуется законом. Не присылайте сведения, которые не нужны для ответа.",
          ],
        },
        {
          h: "6. Ваши права и изменения Политики",
          p: [
            "Вы вправе запросить у Оператора информацию об обработке ваших данных, их уточнение или удаление, направив запрос на {email}. Вы также вправе обратиться в Роскомнадзор.",
            "Если Сайт начнёт собирать иные данные (например, будет подключена аналитика или формы), Оператор заранее обновит Политику и при необходимости получит согласие в форме, предусмотренной законом.",
          ],
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      sections: [
        {
          h: "1. General",
          p: [
            "This Privacy Policy describes what data is processed when you use {site} (the Site). It is drafted in line with Russian Federal Law No. 152-FZ of 27 July 2006 “On Personal Data”.",
            "Site owner and data operator: {owner} (the Operator). Contact: {email}.",
            "The Site requires no registration and has no forms for entering personal data. This Policy is available at the bottom of every page.",
          ],
        },
        {
          h: "2. What data we receive",
          p: [
            "The Operator does not collect or store visitors’ personal data such as names, phone numbers, e-mail addresses, payment details or accounts. The Site has no registration, feedback forms, comments, payments, advertising or web analytics.",
            "The rank, position and heroes you select are processed only in your browser and are not sent to the Operator.",
          ],
        },
        {
          h: "3. Data in your browser",
          p: [
            "The Site stores one setting in your browser’s localStorage: the interface language. It is needed for the interface to work, contains no information about you and is not sent to a server. The Site sets no cookies. You can delete stored data in your browser settings.",
          ],
        },
        {
          h: "4. Technical data and third parties",
          p: [
            "As with any website, the server hosting the Site receives technical request data: IP address, date and time, requested page and browser details. The hosting provider may keep it in logs to operate the service and keep it secure. The Operator does not use it to identify visitors, build profiles or serve ads.",
            "Hero portraits are loaded from Valve Corporation servers (Steam CDN). These servers receive technical request data, as with any image download, and the Operator does not control that processing. Rank icons, fonts and scripts are hosted on the Site itself.",
          ],
        },
        {
          h: "5. E-mail enquiries",
          p: [
            "If you write to {email}, the Operator receives your e-mail address and the content of your message. They are used only to reply, are not shared with third parties and are deleted on request or when the correspondence ends, unless the law requires otherwise. Please do not send information that is not needed for a reply.",
          ],
        },
        {
          h: "6. Your rights and changes",
          p: [
            "You may ask the Operator for information about the processing of your data, or for its correction or deletion, by writing to {email}. You may also contact Roskomnadzor, the Russian data protection authority.",
            "If the Site starts collecting other data (for example, analytics or forms), the Operator will update this Policy in advance and obtain consent in the form required by law where necessary.",
          ],
        },
      ],
    },
  },
  terms: {
    ru: {
      title: "Пользовательское соглашение",
      sections: [
        {
          h: "1. Общие положения",
          p: [
            "Настоящее Пользовательское соглашение (далее — Соглашение) определяет условия использования сайта {site} (далее — Сайт), владелец которого — {owner} (далее — Оператор).",
            "Сайт — бесплатный информационно-справочный сервис: по статистике матчей Dota 2 он показывает героев, статистически подходящих к выбранному драфту. Продолжая использовать Сайт, вы принимаете условия Соглашения. Если вы с ними не согласны, прекратите использование Сайта.",
          ],
        },
        {
          h: "2. Характер информации",
          p: [
            "Рекомендации рассчитываются автоматически на основе публичной статистики матчей, получаемой от сторонних сервисов. Они носят справочный характер, не являются прогнозом результата конкретной игры и не гарантируют победу. Решение о выборе героя вы принимаете самостоятельно.",
          ],
        },
        {
          h: "3. Правила использования",
          p: [
            "Допускается личное некоммерческое использование Сайта. Запрещается нарушать работу Сайта, создавать чрезмерную нагрузку, пытаться получить несанкционированный доступ, использовать автоматизированный сбор материалов Сайта без письменного согласия Оператора, а также использовать Сайт в целях, противоречащих законодательству Российской Федерации.",
          ],
        },
        {
          h: "4. Интеллектуальная собственность",
          p: [
            "Исходный код Сайта опубликован по лицензии MIT, тексты и оформление, кроме материалов третьих лиц, принадлежат Оператору.",
            "Названия, изображения, логотипы, портреты героев и иные материалы, связанные с игрой Dota 2, принадлежат Valve Corporation и (или) другим правообладателям и используются в информационных целях. Сайт не связан с Valve Corporation, не одобрен и не спонсируется ею. Статистические данные получены через сервис STRATZ, с которым Сайт не аффилирован.",
            "Если вы считаете, что материал на Сайте нарушает ваши права, напишите на {email}: Оператор рассмотрит обращение и при необходимости удалит материал.",
          ],
        },
        {
          h: "5. Отказ от гарантий и ответственность",
          p: [
            "Сайт предоставляется «как есть». Оператор не гарантирует бесперебойную работу, точность, полноту и актуальность данных и их пригодность для конкретной цели. В максимально допустимой законодательством Российской Федерации степени Оператор не отвечает за убытки, связанные с использованием или невозможностью использования Сайта, а также за содержание и доступность сторонних ресурсов.",
          ],
        },
        {
          h: "6. Изменения, применимое право и контакты",
          p: [
            "Оператор вправе изменять Соглашение. Новая редакция публикуется на Сайте и действует с момента публикации.",
            "Соглашение регулируется законодательством Российской Федерации. Споры решаются путём переговоров, а при недостижении согласия в суде в порядке, установленном законодательством Российской Федерации. Контакты: {email}.",
          ],
        },
      ],
    },
    en: {
      title: "Terms of Use",
      sections: [
        {
          h: "1. General",
          p: [
            "These Terms of Use (the Terms) set the conditions for using {site} (the Site), owned by {owner} (the Operator).",
            "The Site is a free information service: based on Dota 2 match statistics, it shows heroes that statistically fit the draft you enter. By continuing to use the Site you accept the Terms. If you do not agree, stop using the Site.",
          ],
        },
        {
          h: "2. Nature of the information",
          p: [
            "Recommendations are calculated automatically from public match statistics obtained from third-party services. They are for reference only, are not a forecast of any particular game’s result and do not guarantee a win. You decide which hero to pick.",
          ],
        },
        {
          h: "3. Rules of use",
          p: [
            "Personal, non-commercial use is permitted. You must not disrupt the Site, create excessive load, attempt unauthorised access, scrape the Site automatically without the Operator’s written consent, or use the Site for purposes contrary to the law of the Russian Federation.",
          ],
        },
        {
          h: "4. Intellectual property",
          p: [
            "The Site’s source code is published under the MIT License; its texts and design, other than third-party materials, belong to the Operator.",
            "Names, images, logos, hero portraits and other materials related to Dota 2 belong to Valve Corporation and/or other rights holders and are used for informational purposes. The Site is not affiliated with, endorsed or sponsored by Valve Corporation. Statistics are obtained through the STRATZ service, with which the Site is not affiliated.",
            "If you believe material on the Site infringes your rights, write to {email}; the Operator will review the request and remove the material where appropriate.",
          ],
        },
        {
          h: "5. Disclaimer and liability",
          p: [
            "The Site is provided “as is”. The Operator does not guarantee uninterrupted operation, or the accuracy, completeness or timeliness of the data, or its fitness for a particular purpose. To the fullest extent permitted by the law of the Russian Federation, the Operator is not liable for losses arising from use of, or inability to use, the Site, or for the content and availability of third-party resources.",
          ],
        },
        {
          h: "6. Changes, governing law and contact",
          p: [
            "The Operator may amend the Terms. The new version is published on the Site and takes effect on publication.",
            "The Terms are governed by the law of the Russian Federation. Disputes are resolved by negotiation and, failing that, in court as provided by the law of the Russian Federation. Contact: {email}.",
          ],
        },
      ],
    },
  },
};

const fill = (s: string) =>
  s.replaceAll("{owner}", SITE.owner).replaceAll("{email}", SITE.email).replaceAll("{site}", SITE.url);

export function LegalPage({ doc }: { doc: DocId }) {
  const { lang, t } = useI18n();
  const d = DOCS[doc][lang];
  return (
    <main className="legal">
      <a className="back" href="#">
        {t("back")}
      </a>
      <h1>{d.title}</h1>
      <p className="meta">
        {t("updated", { date: SITE.docsDate })}
        {t("legalNote") ? `. ${t("legalNote")}` : ""}
      </p>
      {d.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((p, i) => (
            <p key={i}>{fill(p)}</p>
          ))}
        </section>
      ))}
    </main>
  );
}

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const years = year > SITE.startYear ? `${SITE.startYear}–${year}` : `${SITE.startYear}`;
  return (
    <footer className="foot">
      <div className="foot-main">
        <p>
          © {years} {SITE.owner}. {t("rights")}
        </p>
        <nav>
          <a href="#privacy">{t("privacy")}</a>
          <a href="#terms">{t("terms")}</a>
          <a href={`mailto:${SITE.email}`}>{t("contact")}</a>
          <span className="age">{SITE.ageMark}</span>
        </nav>
      </div>
      <p>
        {t("trademark")} {t("dataBy")}{" "}
        <a href="https://stratz.com" target="_blank" rel="noopener noreferrer">
          STRATZ
        </a>
        .
      </p>
    </footer>
  );
}