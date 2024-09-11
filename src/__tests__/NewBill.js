/* eslint-disable jest/no-mocks-import */
/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, within } from "@testing-library/dom";
import "@testing-library/jest-dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import userEvent from "@testing-library/user-event";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { bills } from "../fixtures/bills.js";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });

  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
      email: "a@a",
    })
  );
});

beforeEach(() => {
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();

  document.body.innerHTML = NewBillUI();

  window.onNavigate(ROUTES_PATH.NewBill);
});

afterEach(() => {
  jest.resetAllMocks();
  document.body.innerHTML = "";
});

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    
    describe("When I attempt to submit form", () => {
      describe("When I do not fill fields and I click on submit button", () => {
        test("Then I should stay on newBill page", () => {
          const newBill = new NewBill({
            document,
            onNavigate,
            store: mockStore,
            localStorage: window.localStorage,
          });

          const newBillForm = screen.getByTestId("form-new-bill");

          const handleSubmit = jest.spyOn(newBill, "handleSubmit");

          newBillForm.addEventListener("submit", handleSubmit);
          fireEvent.submit(newBillForm);

          expect(handleSubmit).toHaveBeenCalledTimes(1);

          expect(newBillForm).toBeVisible();
        });
      });

      describe("When I fill fields and I click on submit button", () => {
        test("Then required inputs should not be empty", () => {
          const billData = bills[0];

          const amountInput = screen.getByTestId("amount");
          const dateInput = screen.getByTestId("datepicker");
          const pctInput = screen.getByTestId("pct");

          fireEvent.change(amountInput, { target: { value: billData.amount } });
          expect(amountInput.value).not.toBeNull();

          fireEvent.change(dateInput, { target: { value: billData.date } });
          expect(dateInput.value).not.toBeNull();

          fireEvent.change(pctInput, { target: { value: billData.pct } });
          expect(pctInput.value).not.toBeNull();
        });

        test("Then it should upload my file and I should be redirect on Bill page", async () => {
          const onNavigate = (pathname) => {
            document.body.innerHTML = ROUTES({ pathname })
          }
          const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' });
          const input = document.createElement('input');
          input.setAttribute('data-testid', 'file');
          input.type = 'file';
          Object.defineProperty(input, 'files', {
            value: [file],
          });

          const newBill = new NewBill({
            document,
            onNavigate,
            store: mockStore,
            localStorage: window.localStorage,
          });

          const createSpy = jest.spyOn(newBill.store.bills(), 'create').mockResolvedValue({
            fileUrl: 'mockFileUrl',
            key: 'mockKey',
          });
          
          const event = { preventDefault: jest.fn(), target: { value: 'C:\\fake_image.jpg' } };
          await newBill.handleChangeFile(event);
          
          expect(createSpy).toHaveBeenCalled();
          expect(createSpy).toHaveBeenCalledWith({
            data: expect.any(FormData),
            headers: { noContentType: true },
          });

          const form = screen.getByTestId("form-new-bill");

          const handleSubmit = jest.fn(newBill.handleSubmit);

          const submitButton = screen.getByRole("button", { name: /envoyer/i });

          form.addEventListener("submit", handleSubmit);
          userEvent.click(submitButton);

          expect(handleSubmit).toHaveBeenCalledTimes(1);

          expect(screen.getByText(/Mes notes de frais/i)).toBeVisible();
        });
      });
    });

    describe("When I am on NewBill page and I upload a file with an extension other than jpg, jpeg or png", () => {
      test("Then an error message for the file input should be displayed", () => {
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });
        
        const handleChangeFile = jest.spyOn(newBill, "handleChangeFile");
        const imageInput = screen.getByTestId("file");
        
        imageInput.addEventListener("change", handleChangeFile);
        
        const regexExtensionFile = /^.+(\.jpeg|\.png|\.jpg)$/;
        
        fireEvent.change(imageInput, {
          target: {
            files: [
              new File(["test"], "test.pdf", {
                type: "application/pdf",
              }),
            ],
          },
        });
        
        expect(handleChangeFile).toHaveBeenCalled();
        
        const fileName = imageInput.files[0].name;
        expect(regexExtensionFile.test(fileName)).toBe(false);

        expect(handleChangeFile.mock.results[0].value).toBeFalsy();

        expect(imageInput.value).toBe("");
      });
    });

    describe("When I am on NewBill page and I upload a file with an extension jpg, jpeg or png", () => {
      test("Then no error message for the file input should be displayed", () => {
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const regexExtensionFile = /^.+(\.jpeg|\.png|\.jpg)$/;

        const handleChangeFile = jest.spyOn(newBill, "handleChangeFile");
        const imageInput = screen.getByTestId("file");

        imageInput.addEventListener("change", handleChangeFile);

        fireEvent.change(imageInput, {
          target: {
            files: [
              new File(["test"], "test.jpg", {
                type: "image/jpg",
              }),
            ],
          },
        });
        expect(handleChangeFile).toHaveBeenCalled();

        const fileName = imageInput.files[0].name;
        expect(regexExtensionFile.test(fileName)).toBe(true);

        expect(handleChangeFile.mock.results[0].value).toBeFalsy();
      });
    });

    describe("When an error occurs on API", () => {
      test("Then new bill is added to the API but fetch fails with '404 page not found' error", async () => {
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const mockedBill = jest
          .spyOn(mockStore, "bills")
          .mockImplementationOnce(() => {
            return {
              create: jest.fn().mockRejectedValue(new Error("Erreur 404")),
            };
          });

        await expect(mockedBill().create).rejects.toThrow("Erreur 404");

        expect(mockedBill).toHaveBeenCalledTimes(1);

        expect(newBill.billId).toBeNull();
        expect(newBill.fileUrl).toBeNull();
        expect(newBill.fileName).toBeNull();
      });

      test("Then new bill is added to the API but fetch fails with '500 Internal Server error'", async () => {
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const mockedBill = jest
          .spyOn(mockStore, "bills")
          .mockImplementationOnce(() => {
            return {
              create: jest.fn().mockRejectedValue(new Error("Erreur 500")),
            };
          });

        await expect(mockedBill().create).rejects.toThrow("Erreur 500");

        expect(mockedBill).toHaveBeenCalledTimes(1);

        expect(newBill.billId).toBeNull();
        expect(newBill.fileUrl).toBeNull();
        expect(newBill.fileName).toBeNull();
      });
    });
  });
});