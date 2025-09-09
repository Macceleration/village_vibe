# MKStack

Template for building Nostr client application with React 18.x, TailwindCSS 3.x, Vite, shadcn/ui, and Nostrify.

## Features

### Services Marketplace

A local services marketplace that enables community members to offer and request help:

- **Service Offers**: Community members can offer services like yardwork, pet care, elder visits, errands, and odd jobs
- **Service Requests**: Members can request help from their community
- **Geographic Scope**: Services are scoped to tribes (affinity groups) and optionally villages (geographic areas)
- **Trust System**: Integration with Nostr badges and labels for reputation
- **Direct Messaging**: Built-in DM functionality for service coordination
- **Lightning Zaps**: Integrated payment/gratitude system
- **QR Code Generation**: Admins can generate QR codes and posters to promote services

#### Custom Nostr Event Kinds

- **Kind 38857**: Service Offers - Addressable events for offering services
- **Kind 30627**: Service Requests - Addressable events for requesting help
- **Kind 34871**: Service Matches - Records connections between offers and requests

See `NIP.md` for detailed specifications of the custom event kinds and their tag structures.