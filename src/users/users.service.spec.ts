jest.mock("../auth/auth.service", () => ({
  AuthService: class AuthService {},
}));
jest.mock("../files/files.service", () => ({
  FilesService: class FilesService {},
}));

import { UsersService } from "./users.service.js";

describe("UsersService manager identity fields", () => {
  it("persists national code and birth date with the existing profile update", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        id: 10,
        phone: "+989120000001",
        email: "manager@example.com",
        profilePictureId: null,
      }),
      transaction: jest.fn((callback) => callback({})),
      updateById: jest.fn().mockResolvedValue({
        id: 10,
        nationalCode: "0012345678",
        birthDate: "1990-04-21",
      }),
    };
    const service = new UsersService(
      repository as never,
      {} as never,
      {} as never,
      { getOrThrow: jest.fn().mockReturnValue(256) } as never,
    );

    await service.update(10, {
      nationalCode: "0012345678",
      birthDate: "1990-04-21",
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      10,
      {
        nationalCode: "0012345678",
        birthDate: "1990-04-21",
      },
      {},
    );
  });
});
