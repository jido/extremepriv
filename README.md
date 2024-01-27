# extremepriv

Extreme privacy demo page

[Read more](https://medium.com/@bredelet/we-can-have-extreme-privacy-ea424a797e83)

## about extreme privacy

I have had enough of seeing my private information fall in the wrong hands. Extreme privacy aims to solve the issue once and for all.

**The first principle** of the scheme is that personally identifiable information (PII) belongs in the hands of the user, not in the hands of large organisations.

Therefore it should be accessible on user devices only. User devices can elect to share some of it on request, according to the following principles.

**The second principle** is that web-based services should not hold on to personally identifiable information longer than strictly necessary.

If the service needs to use PII, for example when the client would otherwise leave evidence of private information or when forwarding the information to a third-party service, it should be discarded immediately after use.

**The third principle** is that web-based services can only access PII temporarily while the user interacts with the service.

Holding on to it after the user leaves the app (or closes the webpage) is prohibited.

## demonstration of extreme privacy

The demo page offers to create a user account by entering name, date of birth and other *personal information*.

However the information is immediately encrypted using a *cipher key* which stays on the user device.

That prevents any computer other than the user device from accessing it.

To display the user name, the server puts a *placeholder* on the page which is filled in by the browser on the user device. The server doesn't see the name.

The user can leave the page and come back later to see their name in the placeholder thanks to the cipher key.

The cipher key can be *copied to another device or app* to access the same information there.

A future version of the page will demonstrate a page update which shows content supposed to be of interest to the user based on their sex. Because it loads different images depending on personal information, this is done server-side. *Only strictly relevant information is sent* and the server discards it as soon as it finishes preparing the appropriate images.

The future page will also receive a *push notification* suggesting the user to check their inbox.

That form of communication does not require the server to know the user name, address, phone or e-mail.

## technical details

The page uses an AES-GCM 256 bit key for encryption. It stores it in IndexedDB which is local and tied to a specific site.

The encrypted PII is sent to the server so it can be accessed from multiple clients.

Exchange of personal information between client and server will be done using WebSockets.

Push notifications will be received using polling. An actual application could use the push framework provided by the operating system. To reduce the privacy impact, as little data as possible should be given to that framework - in particular there should be no user ID.

The server is based on NestJS and SQLite3. Open the `privateserver` folder for more details.

## limitations of the scheme

Due to the third principle, there are actions that extreme privacy-compliant services cannot perform.

A workaround is to let third-party services take care of them. However these services would likely be non-compliant which would deter users.

Examples of such actions include shipping physical goods to the user doorstep, registering user information for administrative purposes or revealing information related to an offline user to law enforcement.

Some personal information lies in a grey area between public and private, like the e-mail address and phone number of the user.

A compliant service can allow the user to register them outside of the boundaries of personal identifiable information as long as they are clearly labelled as non-private and "at your own risk".

If they are kept private, the app has no means to contact the user other than push notifications and in-app messages.
