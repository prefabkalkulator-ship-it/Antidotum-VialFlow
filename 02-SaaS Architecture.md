Research Report: SaaS Architecture for Dance Schools in the Apple Ecosystem (GCP, Vertex AI, Stripe, Apple Pay) in Light of App Store Regulations and EU DMA (2026)
Introduction to Hybrid Architecture and Regulatory Challenges
Designing modern Software as a Service (SaaS) systems with a hybrid profile requires precise navigation through Apple's highly restrictive and dynamically changing regulatory ecosystem. A system based on Google Cloud Platform infrastructure, utilizing advanced data analytics via Google Vertex AI models to analyze dance progress, constitutes a sophisticated digital value in itself. At the same time, its fundamental commercial goal remains selling access to real-world services, such as physical admission passes for classes in Polish dance schools. The dichotomy between the distribution of digital and physical goods is a critical axis in the evaluation process by the Apple App Review team.   

The architectural and business situation is further complicated by the enforcement of the European Union's Digital Markets Act (DMA) and Apple's updated 2026 guidelines regarding external payments within the European Union. Implementing payment systems that are ultimately intended to bypass the commissions imposed by the platform for In-App Purchases (IAP), relying instead on external providers like Stripe and Apple Pay digital wallet systems handled by the Safari browser or built-in WebView components, requires a deep understanding of the iOS security mechanisms and developer restrictions. This technical-legal analysis meticulously deconstructs the boundary conditions that a hybrid application must meet to successfully pass the certification process, utilize legal EU mechanisms for informing about lower prices on external websites, and offer an optimal User Experience (UX) during transaction finalization.   

App Classification and Compliance Requirements (Solving the Rejection Problem)
A key dilemma in designing a mobile app for dance schools is the correct classification of the units of value being sold. According to the App Store Review Guidelines, payment systems are categorized by a binary division. Digital goods that are consumed within the app environment must be processed exclusively through the In-App Purchase (IAP) system, which stems from guideline 3.1.1. Conversely, physical goods and services whose consumption occurs in the real world outside the app are subject to an absolute mandate to be processed by external payment gateways based on guideline 3.1.3(e).   

The Illusion of "Reader App" Status vs. the Reality of Real-Time Services
Many SaaS system architects mistakenly assume the possibility of basing their business model on the "Reader App" status, defined in guideline 3.1.3(a). This category was historically created by Apple to allow external apps, such as streaming platforms or news readers, to securely log into accounts where users had purchased predefined digital content outside the app.   

Attempting to qualify a dance school management platform as a "Reader App" is an analytical and technical strategy doomed to fail. According to the strict definition, this category exclusively covers programs whose primary and fundamental functionality is providing narrowly defined types of digital content: magazines, newspapers, books, audio, music, or video. An app offering physical class schedules, communication modules, or progress statistics does not sufficiently meet this criterion. Furthermore, the guidelines regulating access to "Reader Apps" privileges (including the special External Link Account Entitlement) explicitly and unequivocally prohibit the facilitation of real-time, person-to-person services. This provision directly excludes booking fitness classes, personal training, live dance consultations, and any interactions with instructors, which form the absolute operational core of a dance school.   

Guideline 3.1.3(e) as the Proper Path for Physical Goods Certification
To ensure the hybrid system is not rejected by Apple reviewers due to the lack of a native IAP implementation, the Stock Keeping Unit (SKU) structure must precisely reflect the division between the digital and physical worlds. Selling access to a dance school, understood as admission passes, workshop tickets, or fees for in-studio classes with an instructor, falls under guideline 3.1.3(e) for Goods and Services Outside of the App.   

By implementing an architecture based on this rule, the developer not only has the right but the obligation to use external payment mechanisms to finalize transactions for physical services. Using native In-App Purchase to sell physical dance lessons would result in automatic app rejection, as platforms like Apple and Google lack the legal and logistical infrastructure to handle consumer disputes concerning services rendered in the physical world. Thus, integrating an external payment gateway (such as Stripe supporting Apple Pay) for purchasing physical passes is fully compliant with global App Store regulations and does not require resorting to special DMA clauses designed solely for the European market.   

The Threat Resulting from Mixed Goods Architecture
A severe danger during the App Review stage arises when a SaaS system begins consolidating physical services with digital added value under a single, shared tariff plan. Introducing advanced machine learning models (such as Google Vertex AI family services) into the app to analyze videos of a student's posture, detect dance stance errors, or generate intelligent progress reports, creates a clear digital good consumed within the app environment.   

If the dance school offers the user a "Premium Subscription" that combines unlimited physical access to training rooms and unlimited access to advanced Vertex AI algorithms directly on the iOS device for a single price, Apple will treat such a package (so-called mixed goods) as a blatant attempt to bypass the IAP system for the digital portion of the service. The certification team will then reject the app, citing a violation of guideline 3.1.1, arguing that digital video analytics must be processed with the appropriate platform operating margin.   

To successfully secure a hybrid SaaS architecture against rejection, engineers should implement the following preventive mechanisms:

Requirement Area	Implementation Method in SaaS
Separation of SKU Models	Passes for physical classes must be categorically separated in the database as real-world services and directed to the Stripe web gateway. AI analytics modules (digital goods) must constitute separate subscription pools.
Multiplatform Availability	
Utilizing guideline 3.1.3(b) (Multiplatform Services), which allows the consumption of digital goods acquired on the dance school's website, strictly provided that the same digital goods are available as an IAP within the mobile app (if not using DMA exemptions).

No Verbal Manipulation	
Every transaction directed outside the Apple environment must unequivocally indicate in the user interface that its subject is a physical service, instructor time reservation, or a physical ticket, avoiding terminology suggesting unlocking software features.

Evaluation Transparency	
The App Review team requires complete test data, including accounts holding paid passes, comprehensive App Review Notes, and a clear declaration of which buttons correspond to external payments for physical goods.

  
Properly classifying products during the database schema design phase on Google Cloud prevents early structural errors. External Stripe payments executing the purchase of physical class access remain completely free of platform commissions, ensuring the dance school receives one hundred percent of the revenue, reduced only by the payment processor's fees.   

DMA Precedents and Anti-Steering Mechanisms in the European Union (2026)
The geopolitical landscape of software distribution has undergone a significant transformation due to the consistent enforcement of the Digital Markets Act (DMA) regulations by the European Commission. Between 2024 and 2026, Apple was forced to thoroughly overhaul its closed policy, ultimately legalizing the removal of "anti-steering" clauses – rules prohibiting developers from informing users about alternative, often cheaper payment options available outside the native app. An analysis of the latest guidelines indicates that the mechanisms allowing users to be directed to external web environments in 2026 are strictly defined and depend on the transaction subject.   

Total Freedom for Physical Services (Dance Classes)
A clear distinction must be made between the rules for physical services and digital goods. In the case of purely physical services – such as purchasing a monthly studio pass, paying for participation in choreographed group classes, or private "person-to-person" lessons – Apple globally does not collect commissions nor impose blocks on sales communication. A developer designing a Polish SaaS system is not obligated to apply for dedicated EU "External Link Entitlement" certificates as long as the transaction exclusively concerns admission to the studio. The iOS app can directly and natively present buttons with an explicit price offer (e.g., "Pay for the semester – 500 PLN") and, upon clicking, invoke an Apple Pay payment using Stripe libraries. Apple claims no rights to collect technological or service fees in this area.   

Complexity of Digital Subscriptions in the EU Model for 2026
The situation becomes drastically complicated if the SaaS platform decides to monetize the digital layer (e.g., advanced video training plans, personalized analytics based on Vertex AI, or access to locked app modules) and wants to encourage the user to purchase this feature on the website due to lower prices (thus bypassing the IAP price parity requirement).

As of January 1, 2026, Apple officially abandoned the old flat-rate Core Technology Fee (CTF) in favor of a unified business model for the territory of the European Union. The new paradigm relies on a complex, cascading commission structure that triggers every time an app uses an external link to sell a digital good. For a hybrid app to legally inform a user about a lower price on its own website and redirect them to an external instance of the Safari browser to purchase a digital module, it must satisfy a restrictive chain of technical operations.   

The process of implementing the anti-steering mechanism for digital goods requires the acceptance of a special legal annex known as the StoreKit External Purchase Link Entitlement (EU) Addendum. Technical implementation dictates that developers use predefined StoreKit APIs. The app in the Xcode environment must include correctly configured SKExternalPurchaseCustomLinkRegions keys covering Poland and other desired European markets.   

Crucially, the regulations demand that the app strictly call a specific showNotice(type:) method before taking the user outside the secure iOS environment. This initiates the display of a highly standardized, unmodifiable modal sheet (Disclosure Sheet), which graphically and textually warns the consumer that they are leaving the Apple ecosystem and transitioning to a third-party developer's site, meaning Apple holds no responsibility for potential refund processes and customer support. Moreover, technical guidelines rigorously define the mechanics of opening the website itself – the link must load in an external browser (defaulting to Safari), and it is categorically forbidden to open these links in hidden browsers embedded in the app (Web Views), which is covered more broadly in the technical analysis.   

Commission Fee Architecture for External Links (Digital SaaS)
The law introduced by the DMA guaranteed freedom of communication, but it did not entirely eliminate distribution fees collected by the operating platform creator. If the app generates a sale of a digital good via a registered external link, the backend infrastructure running on Google Cloud must report every such transaction to Apple using the External Purchase Server API, generating ACQUISITION and SERVICES tokens. Failure to implement a reliable reporting pipeline results in swift sanctions, up to and including the revocation of issued certificates.   

The structure of component fees imposed by Apple for external payments for digital goods in 2026 is as follows:

Apple Fee Component	Value	Application Conditions in the External Model (Web-to-App)
Core Technology Commission (CTC)	5%	
A technological levy replacing the previous CTF. Collected on all digital transactions within the EU, regardless of whether they occur via IAP, Web, or alternative stores.

Store Services Fee (Tier 1)	5%	
Fee for basic distribution in the App Store. In this variant, the app loses access to positioning algorithms (App Store Search), editorial promotions, and users may be deprived of automatic software updates.

Store Services Fee (Tier 2)	13% (or 10%*)	
The full distribution package encompassing all marketing and organic tools in the App Store ecosystem. *A reduced rate of 10% applies to developers with revenues under $1M annually (Small Business Program) and for subscriptions beyond the first year.

Initial Acquisition Fee (IAF)	2%	
A one-time customer acquisition markup. Applied exclusively to payments made within the first 6 months from the initial app download by a given user.

  
The decision to implement an external subscription purchasing system for the digital aspect of a Polish dance school must be backed by strict financial calculations. While savings relative to the global 30% model seem substantial, stacking commissions in the EU environment still leads to the depletion of digital subscription revenue by a range of 10% (Tier 1 + CTC for small businesses without the acquisition fee) to over 20% (in the full Tier 2 package with a new user), to which Stripe processor commissions at the level of 2-3% must additionally be added. The above figures even more strongly justify the necessity of architecturally separating commission-free physical pass fees from taxed digital subscriptions.   

Technical Requirements for Apple Pay Integration via Web (Answer to Question 3)
From a User Experience (UX) design perspective, the strategic goal is to ensure a maximally fluid, almost native payment experience, while the backend architecture delegates the authorization process to an external environment (Stripe) operating in the WWW paradigm. Implementing Apple Pay technology in a browser or a WebView controller encounters severe conflicts at the intersection of iOS system security and cross-platform framework assumptions.

Apple Pay Conflict with WKWebView Components and the Script Injection Problem
The natural instinct of many development teams building hybrid apps (e.g., in React Native or Flutter technologies) is to attempt rendering the webpage with Stripe checkout inside the app itself using the platform's fundamental view – WKWebView. Although Apple formally restored Apple Pay support within this controller starting with iOS 13 (with fixes in iOS 16), practical implementation hits an insurmountable barrier for most hybrid apps.   

The system security measures of the WebKit engine absolutely deactivate the payment module (represented by the ApplePaySession JavaScript object and the Payment Request API interface) if the developer injects any custom scripts during the browser's lifecycle. Calling native methods used to establish communication between the native iOS layer and the web code – such as WKUserScript or the evaluateJavaScript(_:completionHandler:) function – is interpreted by the system as a potential attack vector aimed at stealing cryptographic payment tokens. As a result, the JS bridges commonly used in hybrid apps cause a silent rejection of the ability to pay via Apple Pay; the wallet button does not display at all, or the authorization process ends with an error object immediately after initiating the payment.   

Choosing the Optimal Browser Container for Payments
To successfully deploy the transaction authorization process via Apple Pay operating on the Stripe infrastructure, app engineers must reject payment implementation through a standard WKWebView that uses script injection. An analysis of the guidelines points to two correct deployment paths compliant with Apple's security architecture, dependent on the classification of the sold good.

Navigation Component	Application and Goods Classification	UX Characteristics and Restrictions
External Safari (System)	Exclusively digital goods (mandated by DMA guidelines).	
The app executes the openURL method, entirely transferring the execution context to the native Safari app. This causes a physical exit from the interface (app switch) but guarantees full, flawless cooperation with the biometric authentication system. Emulating this in hidden controllers is forbidden.

SFSafariViewController	Physical services (e.g., booking a spot in a dance class).	
A system overlay launched modally from within the app, operating on a full, isolated Safari process. Provides excellent, nearly native UX (does not throw the user out of the app, maintaining a sense of continuity). It features built-in, rigorous Apple Pay support and does not allow script injection by developers by definition. The ideal environment for a trusted Stripe Checkout invocation.

  
For payments in a hybrid SaaS offering dance classes (requiring a commission-free physical transaction), utilizing SFSafariViewController offers a perfect compromise – from the end user's point of view, it looks like a semi-transparent sheet sliding up from the bottom of the screen without losing the continuity of interacting with the app.

Technical Requirements for Deploying Apple Pay via Stripe on a Web Page
Using external Safari or SFSafariViewController shifts the primary engineering burden to the web layer (GCP, e.g., Cloud Run serving a React/Vue frontend) and the Stripe gateway configuration. Because the app delegates the payment to the WWW ecosystem, this environment must flawlessly cooperate with the rigorous validation protocols imposed by Apple for non-native environments. A complete and professional implementation, preserving optimal UX, forces the execution of the following technical steps:   

Domain Registry Verification (Merchant Validation)
The Apple Pay mechanism on websites will not load the payment sheet until the domain serving the transactional frontend is cryptographically linked to the Apple developer account. Engineers must ensure the hosting of a special verification file under a precisely determined path on the target domain: /.well-known/apple-developer-merchantid-domain-association. This process is initiated via the Stripe Dashboard, which communicates in the background with Apple's verification servers to authorize the SSL/TLS certificate of the domain used (which must unconditionally support the HTTPS protocol for all transmission nodes).   

Generating and Accepting Certificate Signing Requests (CSR)
Proper hardware authorization requires setting up a dedicated merchant identifier (e.g., merchant.com.szkolatanca.saas) in the Apple Developer certificate panel, required for defining the gateway configuration. A crucial mistake often made by backend teams is attempting to generate Request Key files (CSR – Certificate Signing Request) via the native macOS terminal (OpenSSL). Because the Stripe processor is the exclusive intermediary that receives and deconstructs heavily encrypted payment tokens from the mobile device's wallet (DPAN – Device Primary Account Number), the certificate file in .certSigningRequest format must be downloaded exclusively from the Stripe dashboard itself. The file downloaded from Stripe is then uploaded to the Apple Developer panel to assign a Payment Processing Certificate, and the generated file with a .cer extension is loaded back into the Stripe console. This architectural asymmetry relieves the GCP cloud structure of any burden and legal responsibility resulting from PCI DSS audit rigors, significantly reducing DevOps overhead.   

Interface Construction and API Invocation (Payment Request)
The native Apple Pay button, provided by the @stripe/stripe-js library for the frontend, activates the underlying WebKit Payment Request APIs. Apple's regulations strictly mandate that the payment authorization sheet must open directly and immediately as a result of an intentional user interaction (e.g., a physical button click). Attempting to launch confirmPayment from asynchronous, delayed JavaScript code causes the browser to automatically block the payment session under the suspicion of bot interference risk. The backend on GCP must asynchronously generate a PaymentIntent structure for Stripe with a currency mandated by geolocation (PLN), with a prohibition on mixing ISO 4217 currency codes in a single cart.   

Once the user finalizes the authorization using Face ID or Touch ID readers, the payment session in SFSafariViewController sends a PKPaymentAuthorizationStatusSuccess response. Minimizing UX network delays here involves immediately closing the browser overlay in iOS upon receiving the return signal, while the asynchronous verification of funds actually posting to the Stripe account occurs via a secure tunnel utilizing Webhooks hitting a serverless Google Cloud Functions or Cloud Run architecture, updating the pool of available classes in the user's database (e.g., in Firestore).

Conclusions and Systemic Takeaways
The complex matrix of dependencies between Apple's platform regulations (including DMA restrictions), the premises of GCP cloud technologies, and the specific business model of dance schools creates a highly rigorous deployment environment. The optimal and target architecture of a hybrid system under market conditions in 2026 should integrate the following key analytical vectors:

Architectural isolation of digital and physical products: The distribution strategy must rely on a categorical lack of connections between physical services (dance passes) and digital services (AI analytics from Google Vertex). Physical services represent a separate SKU logic, fully exempting the developer from costly, in-platform IAP commissions (guideline 3.1.3(e)). Attempting to combine them into hybrid, inseparable subscription packages (mixed goods) will irreversibly expose the verification process to immediate rejection or force IAP implementation.   

Distancing from "Reader Apps" structure: Despite apparent categorization convenience, the nature of a business based on live human interactions (classes in dance studios) effectively disqualifies a Polish SaaS from preferential participation in a system dedicated solely to static media consumption. The legal path leads through strict definitions of goods provided outside the app.   

Utilizing price notification mechanisms (Anti-Steering in the EU): If the developer decides to introduce unique digital value (e.g., advanced posture correction algorithms) and aims to monetize it outside the iOS ecosystem using anti-steering communication, they must consciously accept the 2026 StoreKit External Purchase Link fee model. Although it bypasses the global 30% brackets, it imposes a burden in the form of mandatory reporting and fees reaching 10–20% of the revenue amount from digital goods due to complex components (CTC, Store Services Fee).   

Native UX based on SFSafariViewController and Stripe: Implementation-related errors around the WKWebView controller (the problem of digital wallet deactivation due to script injection) should be neutralized by using SFSafariViewController views when authorizing the purchase of physical services. This approach, coupled with flawless exchange of CSR certificates originating from Stripe and the deployment of domain authenticating interfaces (merchant association), will guarantee a satisfactory, highly responsive payment chain fully integrated with the system Apple Pay payment chain, ensuring a seamless experience for the end users of dance schools.   

