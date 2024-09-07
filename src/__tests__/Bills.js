/**
 * @jest-environment jsdom
 */
import { screen, waitFor } from "@testing-library/dom";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockedStore from "../__mocks__/store";
import router from "../app/Router.js";
import Bills from "../containers/Bills.js";

jest.mock("../app/Store", () => mockedStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      const windowIcon = screen.getByTestId("icon-window");
      await waitFor(() => windowIcon);
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({
        data: bills,
      });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map(a => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    describe("When I click on New Bill Button", () => {
      test("Then New Bill form should be render", () => {
        const onNavigate = jest.fn();
        const bills = new Bills({
          document,
          onNavigate,
          store: null,
          localStorage: window.localStorage,
        });

        const buttonNewBill = screen.getByTestId("btn-new-bill");
        userEvent.click(buttonNewBill);
        
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill']);
      });
    });

    describe("When I click on one eye icon", () => {
      test("Then a modal should be open", async () => {
        const billUrl = "http://localhost/fake_url";
        document.body.innerHTML = `
          <div data-testid="icon-eye" data-bill-url="${billUrl}"></div>
          <div id="modaleFile">
            <div class="modal-body"></div>
          </div>`;
        
        const bills = new Bills({
          document,
          onNavigate: jest.fn(),
          store: null,
          localStorage: window.localStorage,
        });
        
        const iconEye = screen.getByTestId("icon-eye");
        const modalFile = document.getElementById("modaleFile");

        $.fn.modal = jest.fn();

        userEvent.click(iconEye);

        expect($.fn.modal).toHaveBeenCalled();
        expect(modalFile.querySelector(".bill-proof-container img").src).toBe(billUrl);
      });
    });

    describe("When getBills is called", () => {
      test("It should fetch and format the bills", async () => {
        const billsMock = [
          {
            "id": "1",
            "date": "2023-03-15",
            "status": "pending",
            "vat": "80",
            "fileUrl": "https://test.storage.tld/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
            "type": "Hôtel et logement",
            "commentary": "séminaire billed",
            "name": "encore",
            "fileName": "preview-facture-free-201801-pdf-1.jpg",
            "amount": 400,
            "commentAdmin": "ok",
            "email": "a@a",
            "pct": 20
          },
          {
            "id": "2",
            "date": "2023-02-10",
            "status": "accepted",
            "vat": "",
            "fileUrl": "https://test.storage.tld/v0/b/billable-677b6.a…61.jpeg?alt=media&token=7685cd61-c112-42bc-9929-8a799bb82d8b",
            "type": "Transports",
            "commentary": "plop",
            "pct": 20,
            "name": "test1",
            "fileName": "1592770761.jpeg",
            "amount": 100,
            "commentAdmin": "en fait non",
            "email": "a@a"
          }
        ];
        
          const mockedStore = {
            bills: () => ({
              list: jest.fn().mockResolvedValue(billsMock),
            }),
          };
        
          const billsPage = new Bills({
            document,
            onNavigate: jest.fn(),
            store: mockedStore,
            localStorage: window.localStorage,
          });
        
          const bills = await billsPage.getBills();
        
          expect(bills.length).toBe(2);
          expect(bills[0].date).toBe("15 Mar. 23");
          expect(bills[0].status).toBe("En attente");
          expect(bills[1].date).toBe("10 Fév. 23");
          expect(bills[1].status).toBe("Accepté");
        });
    });

    // test d'intégration GET
    describe("When I navigate to Bills Page", () => {
      test("fetches bills from mock API GET", async () => {
        jest.spyOn(mockedStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        localStorage.setItem(
          "user",
          JSON.stringify({ type: "Employee", email: "a@a" })
        );

        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH.Bills);

        await waitFor(() => screen.getByText("Mes notes de frais"));

        const btnNewBill = await screen.getByTestId('btn-new-bill');

        const billsTableRows = screen.getByTestId("tbody");

        expect(btnNewBill).toBeTruthy();
        expect(billsTableRows).toBeTruthy();
        const rows = billsTableRows.querySelectorAll('tr');
        expect(rows).toHaveLength(4);
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockedStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockedStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});