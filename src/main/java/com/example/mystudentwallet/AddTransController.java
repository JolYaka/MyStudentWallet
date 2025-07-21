package com.example.mystudentwallet;
import java.net.URL;
import java.time.LocalDate;
import java.sql.*;
import java.util.ResourceBundle;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Alert;
import javafx.fxml.Initializable;
import javafx.fxml.FXML;
import javafx.scene.control.TextField;

public class AddTransController implements Initializable {
    @FXML
    private ComboBox<String> categorieBox;
    @FXML
    private TextField descriptionText, montantText;
    @FXML
    private Button saveBtn;
    MainController mainController;

    private static final String DB_URL = "jdbc:sqlite:src/main/resources/com/example/mystudentwallet/myStudentWalletBD.db";

    @Override
    public void initialize(URL location, ResourceBundle resource) {
        setBox();
        setButton();
    }

    private void setBox() {
        String[] contenu = {"Alimentation", "Loisir", "Transport", "Santé", "Revenu"};
        categorieBox.getItems().addAll(contenu);
        // Définir une valeur par défaut
        categorieBox.setValue("Alimentation");
    }

    private void setButton() {
        saveBtn.setOnAction(e -> {
            if (validateInputs()) {
                saveTransaction();
                mainController.navigateToDashboard();
            }
        });
    }

    private boolean validateInputs() {
        // Validation de la description
        String description = descriptionText.getText();
        if (description == null || description.trim().isEmpty()) {
            showAlert("Erreur de validation", "La description est obligatoire !");
            return false;
        }

        // Validation du montant
        String montantStr = montantText.getText();
        if (montantStr == null || montantStr.trim().isEmpty()) {
            showAlert("Erreur de validation", "Le montant est obligatoire !");
            return false;
        }

        try {
            double montant = Double.parseDouble(montantStr);
            if (montant <= 0) {
                showAlert("Erreur de validation", "Le montant doit être positif !");
                return false;
            }
        } catch (NumberFormatException ex) {
            showAlert("Erreur de validation", "Le montant doit être un nombre valide !");
            return false;
        }

        // Validation de la catégorie
        String categorie = categorieBox.getValue();
        if (categorie == null || categorie.trim().isEmpty()) {
            showAlert("Erreur de validation", "Veuillez sélectionner une catégorie !");
            return false;
        }

        return true;
    }

    private void saveTransaction() {
        final String description = descriptionText.getText().trim();
        final double montant = Double.parseDouble(montantText.getText().trim());
        final String categorie = categorieBox.getValue();
        final String date = LocalDate.now().toString();
        final String type = "Revenu".equals(categorie) ? "Revenu" : "Dépense";

        String sql = "INSERT INTO Transactions (description, amount, category, date, type) VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, description);
            stmt.setDouble(2, montant);
            stmt.setString(3, categorie);
            stmt.setString(4, date);
            stmt.setString(5, type);

            int rowsAffected = stmt.executeUpdate();

            if (rowsAffected > 0) {
                showAlert("Succès", "Transaction ajoutée avec succès !");
                clearFields();
            } else {
                showAlert("Erreur", "Erreur lors de l'ajout de la transaction !");
            }

        } catch (SQLException ex) {
            System.err.println("Erreur SQL: " + ex.getMessage());
            showAlert("Erreur de base de données", "Impossible de sauvegarder la transaction.\nErreur: " + ex.getMessage());
        } catch (Exception ex) {
            System.err.println("Erreur inattendue: " + ex.getMessage());
            showAlert("Erreur", "Une erreur inattendue s'est produite !");
        }
    }

    private void clearFields() {
        descriptionText.clear();
        montantText.clear();
        categorieBox.setValue("Alimentation"); // Remettre la valeur par défaut
    }

    private void showAlert(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }
    public void setMainController(MainController m){
        this.mainController=m;
    }
}