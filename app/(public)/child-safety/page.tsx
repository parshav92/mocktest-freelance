"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import Link from "next/link";

const ChildSafetyPage = () => {
    const sections = [
        {
            title: "Our commitment to keeping children safe",
            content: `At Selectorial, the safety, wellbeing and dignity of every child are our highest priorities. We are committed to providing a safe, respectful, inclusive and supportive learning environment for students preparing for selective school examinations.
We recognise that children have the right to learn, participate and develop their abilities without fear of abuse, neglect, bullying, discrimination, harassment or exploitation. Child safety is a shared responsibility involving Selectorial, parents and carers, and everyone who interacts with our platform.
This policy outlines our child safety commitments, expected standards of conduct, online safety expectations and procedures for raising concerns.
`,
        },
        {
            title: "Our Child Safety Commitment",
            content: `Selectorial is committed to:
Putting the safety, wellbeing and best interests of children first.
Treating every child with dignity, fairness and respect.
Promoting a learning environment free from bullying, harassment, discrimination and abuse.
Protecting children from inappropriate online interactions and harmful content.
Respecting children's privacy and handling personal information responsibly.
Providing accessible ways for students and parents to raise concerns.
Taking child safety concerns seriously and responding promptly and appropriately.
Continuously reviewing our child safety practices.
We aim to ensure that every student feels safe, valued and supported throughout their learning journey.
`,
        },
        {
            title: "Scope of this Policy",
            content: `This policy applies to interactions and activities associated with Selectorial, including:
Students using our website, online mock tests, practice questions and learning resources.
Parents and carers who create or manage student accounts.
Tutors, educators, contractors, employees and other representatives, where applicable.
Website administrators and individuals who have access to student information.
Any online communication or educational activity conducted through Selectorial.
This policy applies whether students access our services at home, at school or elsewhere.
`,
        },
        {
            title: "Expected Standards of Conduct",
            content: `Everyone associated with Selectorial is expected to behave in a manner that protects children and promotes respectful learning.
Appropriate conduct includes:
Communicating respectfully and professionally.
Using age-appropriate, educational language and content.
Maintaining appropriate boundaries between adults and students.
Respecting differences in culture, background, ability and learning needs.
Reporting suspected abuse, inappropriate behaviour or safety concerns.
Protecting confidential student information and respecting privacy.
The following conduct is not acceptable:
Bullying, intimidation, humiliation or threatening behaviour.
Sexual harassment, grooming, exploitation or any form of abuse.
Discriminatory, degrading or offensive language.
Requesting or sharing inappropriate images or personal information.
Using student information for unauthorised purposes.
Attempting to establish inappropriate personal relationships with children.
Retaliating against anyone who raises a genuine safety concern.
Where a concern involves someone associated with Selectorial, appropriate action may include restricting access, removing content, suspending an account, ending an engagement or referring the matter to relevant authorities, as appropriate.
`,
        },
        {
            title: "Online Safety and Digital Conduct",
            content: `As an online educational platform, Selectorial recognises the importance of protecting children in digital environments.
We aim to maintain a safe and age-appropriate website through appropriate security measures, responsible information handling and clear behavioural expectations.
Student responsibilities
Students should:
Use the platform for its intended educational purposes.
Keep passwords secure and avoid sharing account credentials.
Never share their home address, phone number, passwords or other sensitive information publicly.
Treat other users respectfully wherever interactive features are available.
Tell a parent, carer or trusted adult if an online interaction makes them feel uncomfortable or unsafe.
Report suspicious messages, inappropriate content or requests for personal information.
Students should never be asked to provide unnecessary personal information to access learning materials or complete practice tests.
Parent and carer responsibilities
Parents and carers are encouraged to:
Maintain age-appropriate oversight of their child's online learning.
Help children understand online privacy and appropriate digital behaviour.
Use accurate account information and safeguard login credentials.
Contact Selectorial if they identify suspicious activity, inappropriate content or a potential safety issue.
Platform safety
Selectorial aims to apply appropriate measures to protect its users, including secure access controls, responsible management of student data and procedures for handling reported concerns.
Any interactive features, communication channels, moderation arrangements and monitoring practices will be governed by the features actually provided by Selectorial and its applicable policies.
`,
        },
        {
            title: "Bullying, Harassment and Discrimination",
            content: `Every student deserves a learning experience free from bullying and discrimination.
Selectorial does not accept behaviour that targets or harms a child because of their background, culture, language, religion, disability, gender or other personal characteristics.
If bullying, harassment or discriminatory conduct is identified in connection with our services, we will assess the concern and take appropriate action within our control.
Students and parents are encouraged to report incidents rather than respond to harmful behaviour with further abuse or retaliation.
`,
        },
        {
            title: "Privacy and Protection of Student Information",
            content: `We understand that students and families entrust us with information when using educational services.
Selectorial is committed to handling personal information responsibly and in accordance with applicable privacy requirements.
Our approach includes:
Collecting only personal information reasonably required for legitimate educational and operational purposes.
Taking appropriate steps to protect student account information and assessment results.
Restricting access to personal information to authorised individuals who need it for legitimate purposes.
Notifying affected individuals and relevant authorities where required following a qualifying data breach.
Providing further information about personal information handling through our Privacy Policy.
Parents and carers should review our Privacy Policy for details about what information is collected, how it is used, how it is protected and how privacy enquiries can be made.
`,
        },
        {
            title: "Reporting a Child Safety Concern",
            content: `If you see something concerning, please speak up.
Students, parents, carers and other members of the community are encouraged to report any suspected abuse, inappropriate behaviour, unsafe online interaction or other child safety concern connected with Selectorial.
To report a concern:
Visit the Contact Us page on the Selectorial website.
Explain what happened, including relevant dates and details, if known.
Identify any immediate safety risks and provide relevant supporting information where safe to do so.
Clearly state that the matter relates to child safety so it can be appropriately prioritised.
You do not need to prove that abuse or misconduct has occurred before raising a genuine concern. Please provide only information that is relevant to the matter.
Selectorial will assess reports appropriately, take reasonable steps to protect children from further harm, and refer matters to the relevant authorities where required.
We will handle reports sensitively and share information only where appropriate and lawful. We cannot guarantee absolute confidentiality in circumstances where disclosure is necessary for child protection, an investigation or compliance with the law.
If a child is in immediate danger, call 000 in Australia. Do not rely on the website contact form for emergencies.
`,
        },
        {
            title: "Responding to Concerns and Complaints",
            content: `Child safety concerns will be handled seriously, sensitively and with the child's safety and wellbeing as the primary consideration.
Where appropriate and within our responsibilities, our response may include:
Assessing the urgency and potential risk to the child.
Taking reasonable steps to prevent further exposure to the reported risk.
Restricting access to relevant accounts, content or services where necessary.
Preserving relevant information for an appropriate investigation.
Referring the concern to police, child protection authorities or another relevant agency where required.
Communicating with parents or carers where appropriate, taking account of the child's safety and any advice from authorities.
Reviewing the incident to identify improvements to our practices.
We will not tolerate retaliation against a person who raises a genuine concern in good faith.
We will not conduct an internal process in a way that compromises a child's safety or interferes with a police or child protection investigation.
`,
        },
        {
            title: "Responsibilities of Parents and Carers",
            content: `Parents and carers play an important role in helping children use online educational services safely.
We encourage families to maintain open conversations about online experiences, provide age-appropriate guidance and contact us if something does not seem right.
Parents and carers should also ensure that students use the platform in accordance with its Terms and Conditions, Privacy Policy and applicable behavioural expectations.
Where a parent or carer raises a concern, Selectorial will consider the information provided and respond within the scope of its responsibilities.
`,
        },
        {
            title: "Continuous Improvement",
            content: `Child safety requires ongoing attention, not simply a published policy.
Selectorial is committed to reviewing this policy and its related practices periodically and when significant changes to our services, risks or applicable requirements occur.
Where relevant to our operations, this may include reviewing access controls, complaint-handling procedures, privacy safeguards, staff or contractor suitability requirements, and online safety measures.
We aim to strengthen our practices over time and encourage feedback from students, families and the wider community.
`,
        },
        {
            title: "External Support and Resources",
            content: `If you or a child needs support or wishes to raise a concern outside Selectorial, the following Australian services may be helpful:
Emergency assistance: Call 000 if a child is in immediate danger.
Kids Helpline: Call 1800 55 1800 for free, confidential counselling for children and young people aged 5–25.
eSafety Commissioner: Visit esafety.gov.au for information about online safety and reporting eligible forms of online harm.
Australian National Office for Child Safety: Visit childsafety.gov.au for national child safety guidance.
NSW Office of the Children's Guardian: Visit ocg.nsw.gov.au for information about child-safe organisations and NSW Child Safe Standards.
Where there is a concern about suspected child abuse or neglect, contact the relevant state or territory child protection authority or police.
Selectorial is committed to fostering a safe, respectful and supportive learning environment where children can build their knowledge, confidence and skills.
`,
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <section
                className="relative pt-32 pb-16 px-6"
                style={{
                    background:
                        "linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)",
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                        Child Safety{" "}
                        <span className="text-sky-600">and Conduct</span>
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Our commitment to keeping children safe while they
                        learn with Selectorial.
                    </p>
                    <p className="text-sm text-slate-500 mt-4">
                        Last updated: October 2026
                    </p>
                </div>
            </section>

            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-slate-50 rounded-3xl border border-slate-100 p-8 md:p-12">
                        <div className="space-y-8">
                            {sections.map((section, index) => (
                                <div key={index}>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-3">
                                        {section.title}
                                    </h2>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                        {section.content}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-200">
                            <p className="text-slate-600">
                                If you have any questions, please{" "}
                                <Link
                                    href="/#contact"
                                    className="text-sky-600 hover:text-sky-700 font-medium"
                                >
                                    contact us
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default ChildSafetyPage;
