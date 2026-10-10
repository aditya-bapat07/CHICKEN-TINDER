import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../lib/db.js";

const conversationUser = { id: true, name: true, username: true } as const;
function pair(first: string, second: string) {
  return first < second
    ? { userOneId: first, userTwoId: second }
    : { userOneId: second, userTwoId: first };
}

export async function chatRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  server.get(
    "/chat/people",
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: z.object({ search: z.string().trim().max(40).optional() }),
      },
    },
    async (request, reply) => {
      const people = await db.user.findMany({
        where: {
          id: { not: request.user.id },
          ...(request.query.search
            ? {
                username: {
                  contains: request.query.search.toLowerCase(),
                  mode: "insensitive",
                },
              }
            : {}),
        },
        select: conversationUser,
        orderBy: { username: "asc" },
        take: 50,
      });
      return reply.send(people);
    },
  );
  server.get(
    "/chat/conversations",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const conversations = await db.chatConversation.findMany({
        where: {
          OR: [{ userOneId: request.user.id }, { userTwoId: request.user.id }],
        },
        include: {
          userOne: { select: conversationUser },
          userTwo: { select: conversationUser },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, username: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      return reply.send(
        conversations.map((conversation) => ({
          id: conversation.id,
          otherUser:
            conversation.userOneId === request.user.id
              ? conversation.userTwo
              : conversation.userOne,
          lastMessage: conversation.messages[0] || null,
        })),
      );
    },
  );
  server.post(
    "/chat/conversations",
    {
      preHandler: [fastify.authenticate],
      schema: { body: z.object({ userId: z.string().uuid() }) },
    },
    async (request, reply) => {
      if (request.body.userId === request.user.id)
        return reply
          .code(400)
          .send({ message: "You cannot message yourself." });
      const otherUser = await db.user.findUnique({
        where: { id: request.body.userId },
        select: conversationUser,
      });
      if (!otherUser)
        return reply.code(404).send({ message: "Member not found." });
      const conversation = await db.chatConversation.upsert({
        where: { userOneId_userTwoId: pair(request.user.id, otherUser.id) },
        create: pair(request.user.id, otherUser.id),
        update: {},
      });
      return reply.send({ id: conversation.id, otherUser, lastMessage: null });
    },
  );
  server.get(
    "/chat/conversations/:id/messages",
    {
      preHandler: [fastify.authenticate],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request, reply) => {
      const conversation = await db.chatConversation.findFirst({
        where: {
          id: request.params.id,
          OR: [{ userOneId: request.user.id }, { userTwoId: request.user.id }],
        },
      });
      if (!conversation)
        return reply.code(404).send({ message: "Conversation not found." });
      return reply.send(
        await db.directMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, username: true } } },
        }),
      );
    },
  );
  server.post(
    "/chat/conversations/:id/messages",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ body: z.string().trim().min(1).max(1000) }),
      },
    },
    async (request, reply) => {
      const conversation = await db.chatConversation.findFirst({
        where: {
          id: request.params.id,
          OR: [{ userOneId: request.user.id }, { userTwoId: request.user.id }],
        },
      });
      if (!conversation)
        return reply.code(404).send({ message: "Conversation not found." });
      const message = await db.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: request.user.id,
          body: request.body.body,
        },
        include: { sender: { select: { id: true, username: true } } },
      });
      return reply.code(201).send(message);
    },
  );
}
