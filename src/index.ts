import { Prisma, PrismaClient } from "@prisma/client";
import { Elysia, InternalServerError, NotFoundError, t } from "elysia";

const app = new Elysia();
const db = new PrismaClient();

app
  .onError(({ error, set, code }) => {
    switch (code) {
      case "VALIDATION":
        set.status = 422;
        const errors = JSON.parse(error.message)["errors"][0];
        console.log(errors);
        return {
          error: errors["message"] + " on " + errors["path"].slice(1),
        };
      case "NOT_FOUND":
        set.status = 404;
        return { error: error.message };
      default:
        set.status = 500;
        return { error: "Internal server error" };
    }
  })

  .get("/courses", async () => {
    const courses = await db.course.findMany();
    return courses;
  })

  .get(
    "/courses/:id",
    async ({ params }) => {
      const course = await db.course.findUnique({ where: { id: params.id } });
      if (!course) {
        throw new NotFoundError("Course not found");
      }
      return course;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    }
  )

  .post(
    "/courses",
    async ({ body }) => {
      const newCourse = await db.course.create({ data: body });
      return newCourse;
    },
    {
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String()),
      }),
    }
  )

  .put(
    "/courses/:id",
    async ({ body, params }) => {
      try {
        const updatedCourse = await db.course.update({
          data: body,
          where: {
            id: params.id,
          },
        });
        return updatedCourse;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Course not found");
        }
        throw new InternalServerError();
      }
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
      params: t.Object({
        id: t.Number(),
      }),
    }
  )

  .delete(
    "/courses/:id",
    async ({ params }) => {
      try {
        const deletedCourse = await db.course.delete({
          where: { id: params.id },
        });
        return deletedCourse;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Course not found");
        }
        throw new InternalServerError("Failed to delete course");
      }
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
